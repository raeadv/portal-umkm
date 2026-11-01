package handlers

import (
	"map-umkm/server/routes/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type RefHandler struct {
	rs *services.RefService
}

func InitRefHandler(rs *services.RefService) *RefHandler {
	return &RefHandler{rs: rs}
}

func (rh *RefHandler) HandleListKategori(c *gin.Context) {
	list, err := rh.rs.ListKategoriService()
	if err != nil {
		failResponse(c, err, "Gagal mengambil data kategori")
		return
	}

	c.JSON(http.StatusOK, gin.H{"kategori": list})
}

func (rh *RefHandler) HandleListProvinsi(c *gin.Context) {
	list, err := rh.rs.ListProvinsiService()
	if err != nil {
		failResponse(c, err, "Gagal mengambil data provinsi")
		return
	}

	c.JSON(http.StatusOK, gin.H{"provinsi": list})
}

// the child lists need their parent kode: lurahdesa alone is 83k rows
func (rh *RefHandler) HandleListKabkota(c *gin.Context) {
	kode := c.Query("kode_provinsi")
	if kode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "kode_provinsi wajib diisi"})
		return
	}

	list, err := rh.rs.ListKabkotaService(kode)
	if err != nil {
		failResponse(c, err, "Gagal mengambil data kabupaten/kota")
		return
	}

	c.JSON(http.StatusOK, gin.H{"kabkota": list})
}

func (rh *RefHandler) HandleListKecamatan(c *gin.Context) {
	kode := c.Query("kode_kabkota")
	if kode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "kode_kabkota wajib diisi"})
		return
	}

	list, err := rh.rs.ListKecamatanService(kode)
	if err != nil {
		failResponse(c, err, "Gagal mengambil data kecamatan")
		return
	}

	c.JSON(http.StatusOK, gin.H{"kecamatan": list})
}

func (rh *RefHandler) HandleListLurahdesa(c *gin.Context) {
	kode := c.Query("kode_kecamatan")
	if kode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "kode_kecamatan wajib diisi"})
		return
	}

	list, err := rh.rs.ListLurahdesaService(kode)
	if err != nil {
		failResponse(c, err, "Gagal mengambil data kelurahan/desa")
		return
	}

	c.JSON(http.StatusOK, gin.H{"lurahdesa": list})
}
