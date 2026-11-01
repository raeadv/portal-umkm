package database

import (
	"map-umkm/server/database/model"

	"gorm.io/gorm"
)

// Migrate runs GORM auto-migration on startup.
func Migrate(db *gorm.DB) error {
	// KategoriUmkm is listed first because Umkm has a foreign key to it
	err := db.AutoMigrate(&model.User{}, &model.KategoriUmkm{}, &model.Umkm{}, &model.FotoUmkm{},
		&model.Provinsi{}, &model.Kabkota{}, &model.Kecamatan{}, &model.Lurahdesa{})
	if err != nil {
		return err
	}

	return seedKategori(db)
}

// Umkm.kategori_id is a required foreign key, so an empty kategori table blocks every create.
// Seeds only when empty (an upsert would burn auto-increment ids on every restart).
func seedKategori(db *gorm.DB) error {
	var n int64
	if err := db.Model(&model.KategoriUmkm{}).Count(&n).Error; err != nil || n > 0 {
		return err
	}

	return db.Create(&[]model.KategoriUmkm{
		{Nama: "Kuliner"}, {Nama: "Fashion"}, {Nama: "Kerajinan"}, {Nama: "Jasa"},
	}).Error
}
