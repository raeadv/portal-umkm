package main

import (
	"context"
	"encoding/base64"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"map-umkm/server/database"
	"map-umkm/server/routes"
	"map-umkm/server/sys"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	var conn database.Connection
	db, err := conn.InitGorm(context.Background())
	if err != nil {
		log.Fatalf("koneksi db gagal: %v", err)
	}
	database.Init(db)

	if err := database.Migrate(db); err != nil {
		log.Fatalf("migration gagal: %v", err)
	}

	g := gin.Default()

	err = setCookieConfig(g)
	if err != nil {
		slog.Error("Gagal Set Cookie: ", "error", err)
		os.Exit(1)
	}

	logfile, err := sys.InitLogger()
	if err != nil {
		slog.Error("Gagal set logger: ", "error", err)
		os.Exit(1)
	}

	defer logfile.Close()

	routes.RegisterApiRoute(g.Group("/api/v1"), db)

	g.Static("/uploads", os.Getenv("UPLOAD_DIR"))

	// serve the built frontend whenever it exists (not tied to MODE, which only drives cookie Secure);
	// SPA fallback for router deep links. Path is relative to the working directory: run from the repo root.
	const webRoot = "./compiled/html"
	if _, err := os.Stat(filepath.Join(webRoot, "index.html")); err != nil {
		slog.Warn("frontend belum di-build, hanya API yang dilayani", "dir", webRoot)
	} else {
		g.NoRoute(func(c *gin.Context) {
			p := c.Request.URL.Path
			// API/upload misses must stay 404, not turn into index.html
			if strings.HasPrefix(p, "/api/") || strings.HasPrefix(p, "/uploads/") {
				c.Status(http.StatusNotFound)
				return
			}
			// real build files first (assets, sw.js, manifest, icons), else SPA fallback
			f := filepath.Join(webRoot, filepath.Clean("/"+p))
			if st, err := os.Stat(f); err == nil && !st.IsDir() {
				c.File(f)
				return
			}
			// a missing asset (/assets/old-hash.js) must be a real 404, not HTML posing as a script
			if filepath.Ext(p) != "" {
				c.Status(http.StatusNotFound)
				return
			}
			c.File(filepath.Join(webRoot, "index.html"))
		})
	}

	g.Run(":" + os.Getenv("API_PORT"))
}

func setCookieConfig(g *gin.Engine) error {
	appName := os.Getenv("APP_NAME")
	if appName == "" {
		return errors.New("APP_NAME tidak ada dalam envvars")
	}
	secret := os.Getenv("APP_SECRET")
	if secret == "" {
		return errors.New("APP_SECRET tidak ada dalam envvars")
	}
	appEncKey := os.Getenv("APP_ENC_KEY")
	if appEncKey == "" {
		return errors.New("APP_ENC_KEY tidak ada dalam envvars")
	}

	encKey, err := base64.StdEncoding.DecodeString(appEncKey)
	if err != nil || len(encKey) != 32 {
		return errors.New("APP_ENC_KEY harus base64 - 32bytes")
	}

	store := cookie.NewStore([]byte(secret), encKey)
	store.Options(sessions.Options{
		Path: "/", MaxAge: 7 * 24 * 3600,
		HttpOnly: true, SameSite: http.SameSiteLaxMode,
		Secure: os.Getenv("MODE") == "production",
	})

	g.Use(sessions.Sessions(appName, store))

	return nil
}
