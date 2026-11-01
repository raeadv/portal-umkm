package sys

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"
)

func InitLogger() (*os.File, error) {
	appName := os.Getenv("APP_NAME")
	loggerDate := time.Now().Format("2006-01-02")
	logFile, err := os.OpenFile(appName+".logger."+loggerDate+".log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, errors.New(fmt.Sprintf("Gagal mengakses log file: %v", err))
	}

	logHandler := slog.NewJSONHandler(logFile, nil)
	appLogger := slog.New(logHandler)
	slog.SetDefault(appLogger)

	return logFile, nil

}
