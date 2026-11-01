package repos

import (
	"map-umkm/server/database/model"

	"gorm.io/gorm"
)

// RefRepo reads the reference tables: kategori and the wilayah hierarchy.
type RefRepo struct {
	db *gorm.DB
}

func InitRefRepo(db *gorm.DB) *RefRepo {
	return &RefRepo{db: db}
}

func (rr *RefRepo) ListKategori() ([]model.KategoriUmkm, error) {
	list := []model.KategoriUmkm{}
	err := rr.db.Order("nama").Find(&list).Error
	return list, err
}

func (rr *RefRepo) ListProvinsi() ([]model.Provinsi, error) {
	list := []model.Provinsi{}
	err := rr.db.Order("nama").Find(&list).Error
	return list, err
}

func (rr *RefRepo) ListKabkota(kodeProvinsi string) ([]model.Kabkota, error) {
	list := []model.Kabkota{}
	err := rr.db.Where("kode_provinsi = ?", kodeProvinsi).Order("nama").Find(&list).Error
	return list, err
}

func (rr *RefRepo) ListKecamatan(kodeKabkota string) ([]model.Kecamatan, error) {
	list := []model.Kecamatan{}
	err := rr.db.Where("kode_kabkota = ?", kodeKabkota).Order("nama").Find(&list).Error
	return list, err
}

func (rr *RefRepo) ListLurahdesa(kodeKecamatan string) ([]model.Lurahdesa, error) {
	list := []model.Lurahdesa{}
	err := rr.db.Where("kode_kecamatan = ?", kodeKecamatan).Order("nama").Find(&list).Error
	return list, err
}
