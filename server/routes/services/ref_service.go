package services

import (
	"map-umkm/server/database/model"
	"map-umkm/server/routes/repos"
)

type RefService struct {
	rr *repos.RefRepo
}

func InitRefService(rr *repos.RefRepo) *RefService {
	return &RefService{rr: rr}
}

func (rs *RefService) ListKategoriService() ([]model.KategoriUmkm, error) {
	return rs.rr.ListKategori()
}

func (rs *RefService) ListProvinsiService() ([]model.Provinsi, error) {
	return rs.rr.ListProvinsi()
}

func (rs *RefService) ListKabkotaService(kodeProvinsi string) ([]model.Kabkota, error) {
	return rs.rr.ListKabkota(kodeProvinsi)
}

func (rs *RefService) ListKecamatanService(kodeKabkota string) ([]model.Kecamatan, error) {
	return rs.rr.ListKecamatan(kodeKabkota)
}

func (rs *RefService) ListLurahdesaService(kodeKecamatan string) ([]model.Lurahdesa, error) {
	return rs.rr.ListLurahdesa(kodeKecamatan)
}
