package repos

import (
	"map-umkm/server/database/model"
	"strings"
	"time"

	"gorm.io/gorm"
)

type UmkmRepo struct {
	db *gorm.DB
}

func InitUmkmRepo(db *gorm.DB) *UmkmRepo {
	return &UmkmRepo{db: db}
}

// bbox is minLng, minLat, maxLng, maxLat; nil means no bounding box.
func (ur *UmkmRepo) ListMarkers(q model.UmkmQuery, bbox []float64) ([]model.UmkmMarker, error) {
	markers := []model.UmkmMarker{}

	tx := ur.db.Model(&model.Umkm{}).Select("id", "nama", "kategori_id", "jenis_usaha", "lat", "lng")
	if bbox != nil {
		tx = tx.Where("lng BETWEEN ? AND ? AND lat BETWEEN ? AND ?", bbox[0], bbox[2], bbox[1], bbox[3])
	}
	tx = applyFilters(tx, q)

	err := tx.Limit(40).Find(&markers).Error
	return markers, err
}

// applyFilters is shared by the map pins and the paged table.
func applyFilters(tx *gorm.DB, q model.UmkmQuery) *gorm.DB {
	if q.Kategori != 0 {
		tx = tx.Where("kategori_id = ?", q.Kategori)
	}
	// column -> wanted value; empty means "not filtering on it"
	for col, val := range map[string]string{"jenis_usaha": q.Jenis, "provinsi_id": q.Provinsi, "kab_kota_id": q.Kabkota,
		"kecamatan_id": q.Kecamatan, "lurah_desa_id": q.Lurahdesa} {
		if val != "" {
			tx = tx.Where(col+" = ?", val)
		}
	}
	// name search: every word must appear somewhere in the name, in any order ("kopi asi" finds "Asiang Kopi")
	for _, word := range strings.Fields(q.Q) {
		tx = tx.Where("nama LIKE ?", "%"+word+"%")
	}

	return tx
}

// ListPage returns one page of full rows plus the total number of matches.
func (ur *UmkmRepo) ListPage(q model.UmkmQuery) ([]model.Umkm, int64, error) {
	rows := []model.Umkm{}
	var total int64

	tx := applyFilters(ur.db.Model(&model.Umkm{}), q)
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := tx.Preload("Kategori").Order("created_at DESC, id").
		Limit(q.PerPage).Offset((q.Page - 1) * q.PerPage).Find(&rows).Error
	return rows, total, err
}

// Stats gathers the dashboard numbers. Each query is small and indexed-ish; fine for a few thousand rows.
func (ur *UmkmRepo) Stats() (model.UmkmStats, error) {
	var s model.UmkmStats
	umkm := func() *gorm.DB { return ur.db.Model(&model.Umkm{}) }

	if err := umkm().Count(&s.Total).Error; err != nil {
		return s, err
	}
	if err := umkm().Where("created_at >= ?", time.Now().AddDate(0, 0, -30)).Count(&s.Baru30Hari).Error; err != nil {
		return s, err
	}
	if err := ur.db.Model(&model.FotoUmkm{}).Count(&s.TotalFoto).Error; err != nil {
		return s, err
	}
	if err := ur.db.Model(&model.FotoUmkm{}).Distinct("umkm_id").Count(&s.DenganFoto).Error; err != nil {
		return s, err
	}

	if err := umkm().Select("kategori_umkms.nama AS nama, COUNT(*) AS total").
		Joins("JOIN kategori_umkms ON kategori_umkms.id = umkms.kategori_id").
		Group("kategori_umkms.id, kategori_umkms.nama").Order("total DESC").Scan(&s.PerKategori).Error; err != nil {
		return s, err
	}
	if err := umkm().Select("jenis_usaha AS nama, COUNT(*) AS total").
		Group("jenis_usaha").Order("total DESC").Scan(&s.PerJenis).Error; err != nil {
		return s, err
	}
	// provinsi links by kode, and umkm without a provinsi simply drops out of the join
	if err := umkm().Select("provinsi.nama AS nama, COUNT(*) AS total").
		Joins("JOIN provinsi ON provinsi.kode = umkms.provinsi_id").
		Group("provinsi.kode, provinsi.nama").Order("total DESC").Limit(5).Scan(&s.PerProvinsi).Error; err != nil {
		return s, err
	}

	s.Terbaru = []model.Umkm{}
	err := ur.db.Preload("Kategori").Select("id", "nama", "kategori_id", "jenis_usaha", "created_at").
		Order("created_at DESC").Limit(5).Find(&s.Terbaru).Error
	return s, err
}

func (ur *UmkmRepo) GetById(id string) (model.Umkm, error) {
	var umkm model.Umkm
	err := ur.db.Preload("Kategori").Where("id = ?", id).First(&umkm).Error
	return umkm, err
}

func (ur *UmkmRepo) CreateUmkmInDb(umkm model.Umkm) (model.Umkm, error) {
	err := ur.db.Omit("Kategori").Create(&umkm).Error
	return umkm, err
}

// Select lists the columns explicitly so empty values (e.g. a cleared keterangan) are written too.
func (ur *UmkmRepo) UpdateUmkmInDb(umkm model.Umkm, id string) error {
	return ur.db.Model(&model.Umkm{}).Where("id = ?", id).
		Select("KategoriID", "JenisUsaha", "Nama", "Alamat", "NoTelepon", "MediaSosial", "Keterangan",
			"Lat", "Lng", "ProvinsiId", "KabKotaId", "KecamatanId", "LurahDesaId").
		Updates(umkm).Error
}

// no foreign key on foto_umkms, so delete the photo rows by hand
func (ur *UmkmRepo) DeleteUmkmInDb(id string) error {
	return ur.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("umkm_id = ?", id).Delete(&model.FotoUmkm{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", id).Delete(&model.Umkm{}).Error
	})
}

func (ur *UmkmRepo) GetFotos(umkmID string) ([]model.FotoUmkm, error) {
	fotos := []model.FotoUmkm{}
	err := ur.db.Where("umkm_id = ?", umkmID).Order("is_cover DESC, urutan, created_at").Find(&fotos).Error
	return fotos, err
}

func (ur *UmkmRepo) CountFotos(umkmID string) (int64, error) {
	var n int64
	err := ur.db.Model(&model.FotoUmkm{}).Where("umkm_id = ?", umkmID).Count(&n).Error
	return n, err
}

func (ur *UmkmRepo) CreateFotoInDb(foto model.FotoUmkm) (model.FotoUmkm, error) {
	err := ur.db.Create(&foto).Error
	return foto, err
}

func (ur *UmkmRepo) GetFotoById(id string) (model.FotoUmkm, error) {
	var foto model.FotoUmkm
	err := ur.db.Where("id = ?", id).First(&foto).Error
	return foto, err
}

func (ur *UmkmRepo) UpdateFotoCaption(id, caption string) error {
	res := ur.db.Model(&model.FotoUmkm{}).Where("id = ?", id).Update("caption", caption)
	if res.Error == nil && res.RowsAffected == 0 {
		// MySQL reports 0 rows for an unchanged value too, so confirm the row exists
		_, err := ur.GetFotoById(id)
		return err
	}
	return res.Error
}

func (ur *UmkmRepo) DeleteFotoInDb(id string) error {
	return ur.db.Where("id = ?", id).Delete(&model.FotoUmkm{}).Error
}
