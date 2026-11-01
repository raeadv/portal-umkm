package database

import (
	"context"
	"errors"
	"fmt"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

type Connection struct{}

func (c *Connection) URL() (string, error) {
	host, port, user, pass, name := os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_DATABASE")
	if host == "" || port == "" || user == "" || name == "" {
		return "", errors.New("missing DB env vars: DB_HOST, DB_PORT, DB_USER, DB_DATABASE")
	}
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=UTC", host, port, user, pass, name), nil
}

func (c *Connection) InitGorm(ctx context.Context) (*gorm.DB, error) {
	url, err := c.URL()
	if err != nil {
		return nil, err
	}
	return gorm.Open(postgres.Open(url), &gorm.Config{
		TranslateError: true,
	})
}

func Init(db *gorm.DB) { DB = db }
