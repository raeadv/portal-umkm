package model

import (
	"errors"

	"gorm.io/gorm"
)

var ErrReadOnly = errors.New("wilayah tables are read-only")

type readOnly struct{}

func (readOnly) BeforeSave(*gorm.DB) error   { return ErrReadOnly }
func (readOnly) BeforeDelete(*gorm.DB) error { return ErrReadOnly }

// Tables link by kode, not id: Provinsi.Kode -> Kabkota.KodeProvinsi -> Kecamatan.KodeKabkota -> Lurahdesa.KodeKecamatan

type Provinsi struct {
	readOnly
	ID    uint    `gorm:"primaryKey" json:"id"`
	Kode  string  `gorm:"size:20;not null;uniqueIndex" json:"kode"`
	Nama  string  `gorm:"size:255;not null" json:"nama"`
	Alias *string `gorm:"size:255" json:"alias"`
}

func (Provinsi) TableName() string { return "provinsi" }

type Kabkota struct {
	readOnly
	ID           uint   `gorm:"primaryKey" json:"id"`
	KodeProvinsi string `gorm:"size:20;not null;index" json:"kode_provinsi"`
	Kode         string `gorm:"size:20;not null;uniqueIndex" json:"kode"`
	Nama         string `gorm:"size:255;not null" json:"nama"`
}

func (Kabkota) TableName() string { return "kabkota" }

type Kecamatan struct {
	readOnly
	ID          uint   `gorm:"primaryKey" json:"id"`
	KodeKabkota string `gorm:"size:20;not null;index" json:"kode_kabkota"`
	Kode        string `gorm:"size:20;not null;uniqueIndex" json:"kode"`
	Nama        string `gorm:"size:255;not null" json:"nama"`
}

func (Kecamatan) TableName() string { return "kecamatan" }

type Lurahdesa struct {
	readOnly
	ID            uint   `gorm:"primaryKey" json:"id"`
	KodeKecamatan string `gorm:"size:20;not null;index" json:"kode_kecamatan"`
	Kode          string `gorm:"size:20;not null;uniqueIndex" json:"kode"`
	Nama          string `gorm:"size:255;not null" json:"nama"`
}

func (Lurahdesa) TableName() string { return "lurahdesa" }
