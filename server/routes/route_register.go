package routes

import (
	"map-umkm/server/routes/handlers"
	"map-umkm/server/routes/middlewares"
	"map-umkm/server/routes/repos"
	"map-umkm/server/routes/services"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterApiRoute(api *gin.RouterGroup, db *gorm.DB) {
	api.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"data": "ok"}) })

	// register auth routes
	registerAuthRoutes(api, db)
	registerUmkmRoutes(api, db)
	registerRefRoutes(api, db)
}

func registerAuthRoutes(api *gin.RouterGroup, db *gorm.DB) {
	authRoutes := api.Group("/auth")

	authRepo := repos.InitAuthRepo(db)
	authService := services.InitAuthService(authRepo)
	authHandler := handlers.InitAuthHandler(authService)

	authRoutes.POST("/login", authHandler.HandleLogin)
	authRoutes.POST("/register", authHandler.HandleRegister)
	authRoutes.GET("/me", middlewares.MustAuthenticated, authHandler.HandleGetAuthStatus)
	authRoutes.POST("/update", middlewares.MustAuthenticated, authHandler.HandleUpdateUser)
	authRoutes.POST("/logout", middlewares.MustAuthenticated, authHandler.HandleLogout)

}

func registerUmkmRoutes(api *gin.RouterGroup, db *gorm.DB) {
	umkmRepo := repos.InitUmkmRepo(db)
	umkmService := services.InitUmkmService(umkmRepo)
	umkmHandler := handlers.InitUmkmHandler(umkmService)

	// reads are public, writes need a login
	umkmRoutes := api.Group("/umkm")
	umkmRoutes.GET("", umkmHandler.HandleListUmkm)
	umkmRoutes.GET("/table", umkmHandler.HandleListUmkmPage)
	umkmRoutes.GET("/stats", middlewares.MustAuthenticated, umkmHandler.HandleUmkmStats)
	umkmRoutes.GET("/:id", umkmHandler.HandleGetUmkm)
	umkmRoutes.POST("", middlewares.MustAuthenticated, umkmHandler.HandleCreateUmkm)
	umkmRoutes.PUT("/:id", middlewares.MustAuthenticated, umkmHandler.HandleUpdateUmkm)
	umkmRoutes.DELETE("/:id", middlewares.MustAuthenticated, umkmHandler.HandleDeleteUmkm)
	umkmRoutes.POST("/:id/foto", middlewares.MustAuthenticated, umkmHandler.HandleUploadFoto)

	api.PATCH("/foto/:id", middlewares.MustAuthenticated, umkmHandler.HandleUpdateFotoCaption)
	api.DELETE("/foto/:id", middlewares.MustAuthenticated, umkmHandler.HandleDeleteFoto)
}

func registerRefRoutes(api *gin.RouterGroup, db *gorm.DB) {
	refRepo := repos.InitRefRepo(db)
	refService := services.InitRefService(refRepo)
	refHandler := handlers.InitRefHandler(refService)

	api.GET("/kategori", refHandler.HandleListKategori)

	wilayahRoutes := api.Group("/wilayah")
	wilayahRoutes.GET("/provinsi", refHandler.HandleListProvinsi)
	wilayahRoutes.GET("/kabkota", refHandler.HandleListKabkota)
	wilayahRoutes.GET("/kecamatan", refHandler.HandleListKecamatan)
	wilayahRoutes.GET("/lurahdesa", refHandler.HandleListLurahdesa)
}
