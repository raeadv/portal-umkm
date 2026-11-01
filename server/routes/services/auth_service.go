package services

import (
	"errors"
	"map-umkm/server/database/model"
	"map-umkm/server/routes/repos"
	"map-umkm/server/sys"

	"github.com/gin-gonic/gin"
	"github.com/rs/xid"
	"golang.org/x/crypto/bcrypt"
)

var ErrOldPassword = errors.New("old password does not match")

type AuthService struct {
	ar *repos.AuthRepo
}

func InitAuthService(ar *repos.AuthRepo) *AuthService {
	return &AuthService{ar: ar}
}

func (as *AuthService) ValidationService(loginData model.LoginData) (model.User, error) {

	user, err := as.ar.ValidateUserByEmail(loginData.Email)
	if err != nil {
		return model.User{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginData.Password)); err != nil {
		return model.User{}, err
	}

	return user, nil

}

func (as *AuthService) RegisterUserService(newUser model.UserData, c *gin.Context) (model.User, error) {
	var userData model.User
	uid := xid.New()

	hashedPwd, err := sys.HashPassword(newUser.Password)
	if err != nil {
		return model.User{}, err
	}

	userData.ID = uid.String()
	userData.Name = newUser.Name
	userData.Email = newUser.Email
	userData.Phone = newUser.Phone
	userData.Password = hashedPwd

	return as.ar.CreateUserInDb(userData, c)

}

func (as *AuthService) UpdateUserService(userUpdate model.UserUpdate, userid string, c *gin.Context) error {
	userData := &model.User{
		Name:  userUpdate.Name,
		Phone: userUpdate.Phone,
	}

	if userUpdate.Password != "" {
		current, err := as.ar.GetUserById(userid)
		if err != nil {
			return err
		}
		if bcrypt.CompareHashAndPassword([]byte(current.Password), []byte(userUpdate.OldPassword)) != nil {
			return ErrOldPassword
		}

		hashedPwd, err := sys.HashPassword(userUpdate.Password)
		if err != nil {
			return err
		}

		userData.Password = hashedPwd
	}

	return as.ar.UpdateUserInDb(*userData, userid, c)

}

func (as *AuthService) AuthStatusService(userid string) (model.User, error) {
	return as.ar.GetUserById(userid)
}
