package handlers

import (
	"errors"
	"log/slog"
	"map-umkm/server/database/model"
	"map-umkm/server/routes/services"
	"net/http"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UmkmHandler struct {
	us *services.UmkmService
}

func InitUmkmHandler(us *services.UmkmService) *UmkmHandler {
	return &UmkmHandler{us: us}
}

func (uh *UmkmHandler) HandleListUmkm(c *gin.Context) {
	var query model.UmkmQuery
	err := c.ShouldBindQuery(&query)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Parameter pencarian tidak valid"})
		return
	}

	markers, err := uh.us.ListUmkmService(query)
	if err != nil {
		if errors.Is(err, services.ErrBbox) {
			c.JSON(http.StatusBadRequest, gin.H{"message": "bbox harus berformat minLng,minLat,maxLng,maxLat"})
			return
		}

		failResponse(c, err, "Gagal mengambil data UMKM")
		return
	}

	c.JSON(http.StatusOK, gin.H{"umkm": markers})
}

func (uh *UmkmHandler) HandleGetUmkm(c *gin.Context) {
	umkm, err := uh.us.GetUmkmService(c.Param("id"))
	if err != nil {
		failResponse(c, err, "Gagal mengambil data UMKM")
		return
	}

	c.JSON(http.StatusOK, gin.H{"umkm": umkm})
}

func (uh *UmkmHandler) HandleCreateUmkm(c *gin.Context) {
	var input model.UmkmInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data UMKM tidak lengkap atau tidak valid"})
		return
	}

	umkm, err := uh.us.CreateUmkmService(input)
	if err != nil {
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Kategori tidak ditemukan"})
			return
		}

		failResponse(c, err, "Gagal simpan data UMKM")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "UMKM berhasil ditambahkan", "umkm": umkm})
}

func (uh *UmkmHandler) HandleUpdateUmkm(c *gin.Context) {
	var input model.UmkmInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Data UMKM tidak lengkap atau tidak valid"})
		return
	}

	umkm, err := uh.us.UpdateUmkmService(input, c.Param("id"))
	if err != nil {
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Kategori tidak ditemukan"})
			return
		}

		failResponse(c, err, "Gagal update data UMKM")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "UMKM berhasil diperbarui", "umkm": umkm})
}

func (uh *UmkmHandler) HandleDeleteUmkm(c *gin.Context) {
	err := uh.us.DeleteUmkmService(c.Param("id"))
	if err != nil {
		failResponse(c, err, "Gagal hapus data UMKM")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "UMKM berhasil dihapus"})
}

// multipart form: field "file" (jpeg/png, max 250 KB), optional "caption"
func (uh *UmkmHandler) HandleUploadFoto(c *gin.Context) {
	// a little above 250 KB to leave room for the multipart envelope; the service checks the file itself
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 512<<10)

	fh, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "File foto tidak ditemukan atau terlalu besar"})
		return
	}

	caption := c.PostForm("caption")
	if utf8.RuneCountInString(caption) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Caption maksimal 500 karakter"})
		return
	}

	foto, err := uh.us.UploadFotoService(c.Param("id"), caption, fh)
	if err != nil {
		if errors.Is(err, services.ErrFotoTipe) {
			c.JSON(http.StatusUnsupportedMediaType, gin.H{"message": "Tipe foto harus jpeg atau png"})
			return
		}

		if errors.Is(err, services.ErrFotoUkuran) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"message": "Ukuran foto maksimal 250 KB"})
			return
		}

		failResponse(c, err, "Gagal upload foto")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Foto berhasil diupload", "foto": foto})
}

// json body: {"caption": "..."} (max 500 characters, empty clears it)
func (uh *UmkmHandler) HandleUpdateFotoCaption(c *gin.Context) {
	var body struct {
		Caption string `json:"caption"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || utf8.RuneCountInString(body.Caption) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Caption maksimal 500 karakter"})
		return
	}

	if err := uh.us.UpdateFotoCaptionService(c.Param("id"), body.Caption); err != nil {
		failResponse(c, err, "Gagal mengubah caption")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Caption berhasil diubah"})
}

func (uh *UmkmHandler) HandleDeleteFoto(c *gin.Context) {
	err := uh.us.DeleteFotoService(c.Param("id"))
	if err != nil {
		failResponse(c, err, "Gagal hapus foto")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Foto berhasil dihapus"})
}

// failResponse answers 404 for a missing row and 500 (logged) for everything else.
func failResponse(c *gin.Context, err error, message string) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"message": "Data tidak ditemukan"})
		return
	}

	slog.Error(message+": ", "error", err)
	c.JSON(http.StatusInternalServerError, gin.H{"message": message})
}

func (uh *UmkmHandler) HandleUmkmStats(c *gin.Context) {
	stats, err := uh.us.StatsUmkmService()
	if err != nil {
		failResponse(c, err, "Gagal mengambil ringkasan UMKM")
		return
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

func (uh *UmkmHandler) HandleListUmkmPage(c *gin.Context) {
	var query model.UmkmQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Parameter pencarian tidak valid"})
		return
	}

	umkm, total, err := uh.us.ListPageUmkmService(query)
	if err != nil {
		failResponse(c, err, "Gagal mengambil data UMKM")
		return
	}

	c.JSON(http.StatusOK, gin.H{"umkm": umkm, "total": total})
}
