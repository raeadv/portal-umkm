package services

import (
	"errors"
	"io"
	"log/slog"
	"map-umkm/server/database/model"
	"map-umkm/server/routes/repos"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/rs/xid"
)

var (
	ErrBbox       = errors.New("format bbox tidak valid")
	ErrFotoTipe   = errors.New("tipe foto harus jpeg atau png")
	ErrFotoUkuran = errors.New("ukuran foto maksimal 250 KB")
	ErrUploadDir  = errors.New("UPLOAD_DIR tidak ada dalam envvars")
)

const maxFotoSize = 250 << 10

var fotoExt = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
}

type UmkmService struct {
	ur *repos.UmkmRepo
}

func InitUmkmService(ur *repos.UmkmRepo) *UmkmService {
	return &UmkmService{ur: ur}
}

func (us *UmkmService) ListUmkmService(q model.UmkmQuery) ([]model.UmkmMarker, error) {
	bbox, err := parseBbox(q.Bbox)
	if err != nil {
		return nil, err
	}

	return us.ur.ListMarkers(q, bbox)
}

func (us *UmkmService) GetUmkmService(id string) (model.UmkmDetail, error) {
	umkm, err := us.ur.GetById(id)
	if err != nil {
		return model.UmkmDetail{}, err
	}

	fotos, err := us.ur.GetFotos(id)
	if err != nil {
		return model.UmkmDetail{}, err
	}

	for i := range fotos {
		fotos[i].URL = "/uploads/" + fotos[i].FilePath
	}

	return model.UmkmDetail{Umkm: umkm, Fotos: fotos}, nil
}

func (us *UmkmService) CreateUmkmService(in model.UmkmInput) (model.Umkm, error) {
	umkm := umkmFromInput(in)
	umkm.ID = xid.New().String()

	if _, err := us.ur.CreateUmkmInDb(umkm); err != nil {
		return model.Umkm{}, err
	}

	// re-read so the response has the kategori filled in, same as update
	return us.ur.GetById(umkm.ID)
}

func (us *UmkmService) UpdateUmkmService(in model.UmkmInput, id string) (model.Umkm, error) {
	// affected rows is 0 when nothing changed, so check existence first to return 404 properly
	if _, err := us.ur.GetById(id); err != nil {
		return model.Umkm{}, err
	}

	if err := us.ur.UpdateUmkmInDb(umkmFromInput(in), id); err != nil {
		return model.Umkm{}, err
	}

	return us.ur.GetById(id)
}

func (us *UmkmService) DeleteUmkmService(id string) error {
	if _, err := us.ur.GetById(id); err != nil {
		return err
	}

	if err := us.ur.DeleteUmkmInDb(id); err != nil {
		return err
	}

	// rows are gone; a leftover folder is only logged
	dir, err := uploadDir()
	if err == nil {
		if err := os.RemoveAll(filepath.Join(dir, id)); err != nil {
			slog.Error("Gagal hapus folder foto: ", "umkm", id, "error", err)
		}
	}

	return nil
}

func (us *UmkmService) UploadFotoService(umkmID, caption string, fh *multipart.FileHeader) (model.FotoUmkm, error) {
	// umkmID is checked against the DB before it is used as a folder name
	if _, err := us.ur.GetById(umkmID); err != nil {
		return model.FotoUmkm{}, err
	}

	if fh.Size > maxFotoSize {
		return model.FotoUmkm{}, ErrFotoUkuran
	}

	dir, err := uploadDir()
	if err != nil {
		return model.FotoUmkm{}, err
	}

	src, err := fh.Open()
	if err != nil {
		return model.FotoUmkm{}, err
	}
	defer src.Close()

	// trust the file's bytes, not the client's filename or content-type
	head := make([]byte, 512)
	n, _ := io.ReadFull(src, head)
	ext, ok := fotoExt[http.DetectContentType(head[:n])]
	if !ok {
		return model.FotoUmkm{}, ErrFotoTipe
	}
	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return model.FotoUmkm{}, err
	}

	if err := os.MkdirAll(filepath.Join(dir, umkmID), 0o755); err != nil {
		return model.FotoUmkm{}, err
	}

	relPath := filepath.ToSlash(filepath.Join(umkmID, xid.New().String()+ext))
	fullPath := filepath.Join(dir, relPath)

	dst, err := os.OpenFile(fullPath, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o644)
	if err != nil {
		return model.FotoUmkm{}, err
	}
	_, err = io.Copy(dst, src)
	if cerr := dst.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		os.Remove(fullPath)
		return model.FotoUmkm{}, err
	}

	count, err := us.ur.CountFotos(umkmID)
	if err != nil {
		os.Remove(fullPath)
		return model.FotoUmkm{}, err
	}

	foto, err := us.ur.CreateFotoInDb(model.FotoUmkm{
		ID:       xid.New().String(),
		UmkmID:   umkmID,
		FilePath: relPath,
		Caption:  caption,
		IsCover:  count == 0, // the first photo becomes the cover
	})
	if err != nil {
		os.Remove(fullPath) // no orphan file when the row failed
		return model.FotoUmkm{}, err
	}

	foto.URL = "/uploads/" + foto.FilePath
	return foto, nil
}

func (us *UmkmService) UpdateFotoCaptionService(id, caption string) error {
	return us.ur.UpdateFotoCaption(id, caption)
}

func (us *UmkmService) DeleteFotoService(id string) error {
	foto, err := us.ur.GetFotoById(id)
	if err != nil {
		return err
	}

	if err := us.ur.DeleteFotoInDb(id); err != nil {
		return err
	}

	dir, err := uploadDir()
	if err == nil {
		if err := os.Remove(filepath.Join(dir, foto.FilePath)); err != nil && !os.IsNotExist(err) {
			slog.Error("Gagal hapus file foto: ", "foto", id, "error", err)
		}
	}

	return nil
}

func umkmFromInput(in model.UmkmInput) model.Umkm {
	return model.Umkm{
		KategoriID:  in.KategoriID,
		JenisUsaha:  in.JenisUsaha,
		Nama:        in.Nama,
		Alamat:      in.Alamat,
		NoTelepon:   in.NoTelepon,
		MediaSosial: in.MediaSosial,
		Keterangan:  in.Keterangan,
		Lat:         *in.Lat,
		Lng:         *in.Lng,
		ProvinsiId:  in.ProvinsiId,
		KabKotaId:   in.KabKotaId,
		KecamatanId: in.KecamatanId,
		LurahDesaId: in.LurahDesaId,
	}
}

func uploadDir() (string, error) {
	dir := os.Getenv("UPLOAD_DIR")
	if dir == "" {
		return "", ErrUploadDir
	}
	return dir, nil
}

// "minLng,minLat,maxLng,maxLat"; empty means no bounding box.
func parseBbox(s string) ([]float64, error) {
	if s == "" {
		return nil, nil
	}

	parts := strings.Split(s, ",")
	if len(parts) != 4 {
		return nil, ErrBbox
	}

	bbox := make([]float64, 4)
	for i, p := range parts {
		v, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
		if err != nil {
			return nil, ErrBbox
		}
		bbox[i] = v
	}

	if bbox[0] > bbox[2] || bbox[1] > bbox[3] {
		return nil, ErrBbox
	}

	return bbox, nil
}

func (us *UmkmService) StatsUmkmService() (model.UmkmStats, error) {
	return us.ur.Stats()
}

// ListPageUmkmService clamps paging so a bad page/per_page can't ask for everything.
func (us *UmkmService) ListPageUmkmService(q model.UmkmQuery) ([]model.Umkm, int64, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PerPage < 1 || q.PerPage > 100 {
		q.PerPage = 10
	}
	return us.ur.ListPage(q)
}
