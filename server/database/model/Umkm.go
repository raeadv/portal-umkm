package model

import "time"

type JenisUsaha string

const (
	JenisBarang JenisUsaha = "barang"
	JenisJasa   JenisUsaha = "jasa"
)

type Umkm struct {
	ID          string       `gorm:"primaryKey" json:"id"`
	KategoriID  uint16       `gorm:"not null;index" json:"kategori_id"`
	Kategori    KategoriUmkm `gorm:"constraint:OnDelete:RESTRICT" json:"kategori"`
	JenisUsaha  JenisUsaha   `gorm:"type:varchar(10);not null" json:"jenis_usaha"`
	Nama        string       `gorm:"type:varchar(200)" json:"nama"`
	Alamat      string       `gorm:"type:text" json:"alamat"`
	NoTelepon   string       `gorm:"type:varchar(20)" json:"no_telepon"`
	MediaSosial string       `gorm:"type:varchar(255)" json:"media_sosial"`
	Keterangan  string       `gorm:"type:text" json:"keterangan"`
	Lat         float64      `gorm:"type:decimal(11,8);null" json:"lat"`
	Lng         float64      `gorm:"type:decimal(11,8);null" json:"lng"`
	ProvinsiId  string       `gorm:"type:varchar(20);null" json:"provinsi_id"`
	KabKotaId   string       `gorm:"type:varchar(20);null" json:"kabkota_id"`
	KecamatanId string       `gorm:"type:varchar(20);null" json:"kecamatan_id"`
	LurahDesaId string       `gorm:"type:varchar(20);null" json:"lurahdesa_id"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

type UmkData struct {
	ID         string  `json:"id"`
	Nama       string  `json:"nama"`
	Alamat     string  `json:"alamat"`
	Keterangan string  `json:"keterangan"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
}

type KategoriUmkm struct {
	ID   uint16 `gorm:"primaryKey;autoIncrement" json:"id"`
	Nama string `gorm:"size:100;not null;uniqueIndex" json:"name"`
}

type FotoUmkm struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	UmkmID    string    `gorm:"not null;index" json:"umkm_id"`
	FilePath  string    `gorm:"size:500;not null" json:"file_path"`
	Caption   string    `gorm:"size:500;not null;default:''" json:"caption"`
	IsCover   bool      `gorm:"not null;default:false" json:"is_cover"`
	Urutan    int       `gorm:"not null;default:0" json:"urutan"`
	CreatedAt time.Time `json:"created_at"`
	URL       string    `gorm:"-" json:"url"` // filled by the service: "/uploads/" + FilePath
}

// UmkmInput is the create/update body. Lat/Lng are pointers so 0 is not mistaken for "missing";
// bounds are rough Indonesia (catches swapped coordinates).
type UmkmInput struct {
	KategoriID  uint16     `binding:"required" json:"kategori_id"`
	JenisUsaha  JenisUsaha `binding:"required,oneof=barang jasa" json:"jenis_usaha"`
	Nama        string     `binding:"required,max=200" json:"nama"`
	Alamat      string     `json:"alamat"`
	NoTelepon   string     `binding:"omitempty,max=20" json:"no_telepon"`
	MediaSosial string     `binding:"omitempty,max=255" json:"media_sosial"`
	Keterangan  string     `json:"keterangan"`
	Lat         *float64   `binding:"required,gte=-11,lte=6" json:"lat"`
	Lng         *float64   `binding:"required,gte=95,lte=141" json:"lng"`
	ProvinsiId  string     `binding:"omitempty,max=20" json:"provinsi_id"`
	KabKotaId   string     `binding:"omitempty,max=20" json:"kabkota_id"`
	KecamatanId string     `binding:"omitempty,max=20" json:"kecamatan_id"`
	LurahDesaId string     `binding:"omitempty,max=20" json:"lurahdesa_id"`
}

// UmkmQuery is the list filter: GET /umkm?bbox=minLng,minLat,maxLng,maxLat&kategori=&q=
type UmkmQuery struct {
	Bbox      string `form:"bbox"`
	Kategori  uint16 `form:"kategori"`
	Q         string `form:"q"`
	Jenis     string `form:"jenis"`
	Provinsi  string `form:"provinsi"`
	Kabkota   string `form:"kabkota"`
	Kecamatan string `form:"kecamatan"`
	Lurahdesa string `form:"lurahdesa"`
	Page      int    `form:"page"`
	PerPage   int    `form:"per_page"`
}

// UmkmMarker is the light row for map pins.
type UmkmMarker struct {
	ID         string     `json:"id"`
	Nama       string     `json:"nama"`
	KategoriID uint16     `json:"kategori_id"`
	JenisUsaha JenisUsaha `json:"jenis_usaha"`
	Lat        float64    `json:"lat"`
	Lng        float64    `json:"lng"`
}

// StatCount is one bar of a breakdown (per kategori, per jenis, per provinsi).
type StatCount struct {
	Nama  string `json:"nama"`
	Total int64  `json:"total"`
}

// UmkmStats is the admin dashboard summary.
type UmkmStats struct {
	Total        int64       `json:"total"`
	Baru30Hari   int64       `json:"baru_30_hari"`
	DenganFoto   int64       `json:"dengan_foto"` // umkm having at least one photo
	TotalFoto    int64       `json:"total_foto"`
	PerKategori  []StatCount `json:"per_kategori"`
	PerJenis     []StatCount `json:"per_jenis"`
	PerProvinsi  []StatCount `json:"per_provinsi"` // top 5
	Terbaru      []Umkm      `json:"terbaru"`      // latest 5
}

type UmkmDetail struct {
	Umkm
	Fotos []FotoUmkm `json:"fotos"`
}
