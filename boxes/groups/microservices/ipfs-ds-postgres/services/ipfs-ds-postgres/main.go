package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	pgds "github.com/alanshaw/ipfs-ds-postgres"
	ipfs "github.com/ipfs/go-datastore"
)

var ds, err = pgds.NewDatastore(
	context.Background(), 
	getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/postgres", false), 
	pgds.Table("blocks"),
)

func get(w http.ResponseWriter, req *http.Request) {
	key := req.URL.Query().Get("key")

	fmt.Println("getting :", key)

	if key == "" {
		panic("no key")
	}

	value, err := ds.Get(ipfs.NewKey(key))

	if err != nil {
		panic(err)
	}

	_, err = w.Write(value)
	if err != nil {
		panic("issue returning")
	}
}

func add(w http.ResponseWriter, req *http.Request) {
	key := req.URL.Query().Get("key")

	fmt.Println("adding :", key)

	if key == "" {
		panic("no key")
	}

	if req.Method != "POST" {
		panic("not POST")
	}

	body, err := ioutil.ReadAll(req.Body)

	if err != nil {
		panic("error readying body")
	}
	
	err = ds.Put(ipfs.NewKey(key), body)

	if err != nil {
		panic(err)
	}
}

func getenv(key, fallback string, port bool) string {
    value := os.Getenv(key)

    if len(value) == 0 {
        return fallback
    }

	if(port) {
		return ":" + value
	} else {
		return parseUrl(value)
	}
}

func parseUrl(value string) string {
	base := strings.Replace(value, "postgres://", "", -1)
	index := strings.Index(base,":")
	user := base[0:index]

	base = strings.Replace(base, user + ":", "", -1)
	index = strings.Index(base, "@")
	password := base[0:index]

	base = strings.Replace(base, password + "@", "", -1)
	base = "postgres://" + base

	u, err := url.Parse(base)
	if err != nil {
		panic(err)
	}
	u.User = url.UserPassword(user, password)

	return u.String()
}

func main() {
	if err != nil {
		panic(err)
	}
	
    http.HandleFunc("/get", get)
    http.HandleFunc("/add", add)

    log.Fatal(http.ListenAndServe(getenv("IPFS_POSTGRESQL_PORT",":8090",true), nil))
}