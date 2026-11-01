package repos

import (
	"map-umkm/server/database/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthRepo struct {
	db *gorm.DB
}

func InitAuthRepo(db *gorm.DB) *AuthRepo {
	return &AuthRepo{db: db}
}

func (ar *AuthRepo) ValidateUserByEmail(email string) (model.User, error) {
	var user model.User
	tx := ar.db.Model(model.User{}).Where("email = ? ", email).First(&user)
	if tx.Error != nil {
		return user, tx.Error
	}

	return user, nil
}

func (ar *AuthRepo) GetUserById(userid string) (model.User, error) {
	var user model.User
	tx := ar.db.Model(model.User{}).Where("id = ?", userid).First(&user)
	if tx.Error != nil {
		return user, tx.Error
	}

	return user, nil
}

func (ar *AuthRepo) UpdateUserInDb(userData model.User, userid string, c *gin.Context) error {

	tx := ar.db.Model(model.User{}).Where("id = ?", userid).Updates(userData)
	return tx.Error
}

func (ar *AuthRepo) CreateUserInDb(newUser model.User, c *gin.Context) (model.User, error) {

	res := gorm.WithResult()
	gorm.G[model.User](ar.db, res).Create(c, &newUser)

	if res.Error != nil {

		return model.User{}, res.Error
	}

	return newUser, nil

}
