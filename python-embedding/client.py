import requests
import engraft_python

# make a request to the wikipedia API to get 5 random articles
response = requests.get(
    url="https://en.wikipedia.org/w/api.php",
    params={
        "origin": '*',
        "format": 'json',
        "action": 'query',
        "generator": 'random',
        "grnnamespace": "0",
        "prop": 'pageimages|extracts',
        "grnlimit": "5"
    }
)

res = engraft_python.useEngraft(response, "wikipedia.json", False)
print(res)