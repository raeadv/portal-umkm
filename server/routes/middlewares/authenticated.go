package middlewares

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func MustAuthenticated(c *gin.Context) {
	session := sessions.Default(c)
	userid := session.Get("userid")
	if userid == nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Silahkan Login untuk akses Admin"})
		return
	}

	c.Set("userid", userid)
	c.Next()
}
