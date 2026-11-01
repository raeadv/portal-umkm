package handlers

import (
	"errors"
	"fmt"
	"log/slog"
	"map-umkm/server/database/model"
	"map-umkm/server/routes/services"
	"net/http"
	"os"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	as *services.AuthService
}

func InitAuthHandler(as *services.AuthService) *AuthHandler {
	return &AuthHandler{as: as}
}

func (ah *AuthHandler) HandleLogin(c *gin.Context) {
	var loginData model.LoginData
	err := c.ShouldBindJSON(&loginData)
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Data Login tidak lengkap",
			},
		)
		return
	}

	user, err := ah.as.ValidationService(loginData)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			slog.Warn("Auth attempt with invalid email: ", "email", loginData.Email)
		}

		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			slog.Warn("Auth attempt with invalid password: ", "email", loginData.Email)
		}

		c.JSON(
			http.StatusUnauthorized,
			gin.H{
				"message": "Email/username tidak valid, coba kembali",
			},
		)
		return
	}

	err = ah.setLoginCookie(c, user)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Gagal Membuat login cookie",
			},
		)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Login Sukses", "user": gin.H{
		"name":  user.Name,
		"email": user.Email,
		"phone": user.Phone,
	}})

}

func (ah *AuthHandler) HandleRegister(c *gin.Context) {
	var userData model.UserData
	err := c.ShouldBindJSON(&userData)
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"message": "Data User tidak lengkap",
			},
		)
		return
	}

	newUser, err := ah.as.RegisterUserService(userData, c)
	if err != nil {

		if errors.Is(err, gorm.ErrDuplicatedKey) {
			c.JSON(
				http.StatusConflict,
				gin.H{
					"message": "Email yang digunakan sudah ada",
				},
			)

			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Gagal simpan Data User baru",
			},
		)
		return
	}

	err = ah.setLoginCookie(c, newUser)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"message": "Gagal Membuat login cookie",
			},
		)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Login Sukses, Mengalihkan ke halaman admin", "user": gin.H{
		"name":  newUser.Name,
		"email": newUser.Email,
		"phone": newUser.Phone,
	}})

}

func (ah *AuthHandler) HandleUpdateUser(c *gin.Context) {
	userid, exists := c.Get("userid")
	if !exists || userid == "" {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"message": "user id tidak ditemukan, silahkan login kembali"})
		return
	}

	var userUpdate model.UserUpdate
	err := c.ShouldBindJSON(&userUpdate)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"message": "Data user tidak valid",
		})
		return
	}

	err = ah.as.UpdateUserService(userUpdate, fmt.Sprint(userid), c)
	if errors.Is(err, services.ErrOldPassword) {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "Password lama salah"})
		return
	}
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal Update data user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Data user berhasil diperbarui"})
}

func (ah *AuthHandler) HandleGetAuthStatus(c *gin.Context) {

	userid, exists := c.Get("userid")
	if !exists || userid == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "user id tidak ditemukan, silahkan login kembali"})
		return
	}

	user, err := ah.as.AuthStatusService(fmt.Sprint(userid))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "user tidak ditemukan, silahkan login kembali"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session Ditemukan", "user": gin.H{
		"name":  user.Name,
		"email": user.Email,
		"phone": user.Phone,
	}})
}

func (ah *AuthHandler) HandleLogout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	session.Options(sessions.Options{
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   os.Getenv("MODE") == "production",
	})

	err := session.Save()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "gagal logout"})
		slog.Error("Gagal Logout: ", "error", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (ah *AuthHandler) setLoginCookie(c *gin.Context, user model.User) error {
	session := sessions.Default(c)
	session.Set("userid", user.ID)
	return session.Save()
}
