import requests
import sys
sys.path.append("../")
import engraft
import unittest

def wikipedia_extractor(response):
    return engraft.run_engraft(response, "wikipedia.json", edit=False)
    
class MyTest(unittest.TestCase):
    def test_wikipedia_extractor(self):
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
        })
        
        data = response.json()
        pages_dict = data['query']['pages']
        page_ids = pages_dict.keys()
        pages_list = [pages_dict[page_id] for page_id in page_ids]
        pages_list.sort(key=lambda x: x['pageid'])

        title2 = pages_list[1]['title']
        title3 = pages_list[2]['title']

        correct = [title2, title3]
        self.assertEqual(wikipedia_extractor(response), correct)

if __name__ == '__main__':
    unittest.main()