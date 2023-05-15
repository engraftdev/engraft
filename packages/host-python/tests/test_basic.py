import requests
import sys
sys.path.append("..")
import engraft
import unittest
import numpy as np

def wikipedia_extractor(response):
    return engraft.run_engraft(response, "wikipedia.json", edit=False)
    
class MyTest(unittest.TestCase):
    """
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
    """

    def test_nd_array(self):
        #a = np.array([[1,2,3],[4,5,6]])
        a = [[1,2,3], np.array([4,5,6]), 3]
        b = engraft.run_engraft(a, "nd_array.json", edit=True)
        print(b)

if __name__ == '__main__':
    unittest.main()
