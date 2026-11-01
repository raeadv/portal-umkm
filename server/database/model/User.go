package model

import "time"

type User struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:255" json:"name"`
	Email     string    `gorm:"size:255;unique" json:"email"`
	Phone     string    `gorm:"size:255" json:"phone"`
	Password  string    `gorm:"size:255" json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type LoginData struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserData struct {
	Name     string `binding:"required" json:"name"`
	Email    string `binding:"required,email" json:"email"`
	Password string `binding:"required,min=8,max=20" json:"password"`
	Phone    string `binding:"required,min=10" json:"phone"`
}

type UserUpdate struct {
	Name     string `binding:"required" json:"name"`
	Password string `binding:"omitempty,min=8,max=20" json:"password"`
	// required when a new password is sent
	OldPassword string `binding:"required_with=Password" json:"old_password"`
	Phone       string `binding:"required,min=10" json:"phone"`
}
