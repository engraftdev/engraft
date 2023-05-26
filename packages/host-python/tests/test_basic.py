import requests
import sys
sys.path.append("..")
import engraft
import unittest
import numpy as np
import json


def wikipedia_extractor(response):
    return engraft.run_engraft(response, "wikipedia.json", edit=False)

def mixed_type_array(a):
    return engraft.run_engraft(a, "mixed_type.json", edit=False)

def nd_array_elementwise_add(a):
    return engraft.run_engraft(a, "nd_array.json", edit=False)
    
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
        output = wikipedia_extractor(response)
        expected = [title2, title3]
        self.assertEqual(output, expected)

    def test_mixed_type_array(self):
        input = [4, [1,2,3], np.array([4,5,6]), 3]
        output = mixed_type_array(input).all()
        expected = input[2].all()
        self.assertEqual(output, expected)

    def test_nd_array_elementwise_add(self):
        input = np.array([1,2,3])
        output = nd_array_elementwise_add(input).all()
        expected = (input + 4).all()
        self.assertEqual(output, expected)

    def test_decoder(self):
        class CustomDecoder(json.JSONDecoder):
            def decode(self, json_string):
                def object_hook(obj):
                    if '__type' in obj:
                        if obj['__type'] == 'nd-array':
                            return np.array(obj['__value'])
                    return obj
                return json.loads(json_string, object_hook=object_hook)   
    
        json_string = '[4, [1, 2, 3], {"__type": "nd-array", "__value": [4, 5, 6]}, 3]'
        output = CustomDecoder().decode(json_string)
        output[2] = output[2].all()
        expected = [4, [1, 2, 3], np.array([4,5,6]).all(), 3]
        self.assertEqual(output, expected)

    def test_encoder(self):
        class CustomEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, np.ndarray):
                    return {"__type": "nd-array", "__value": obj.tolist()}
                return json.JSONEncoder.default(self, obj)    
        
        input = [4, [1,2,3], np.array([4,5,6]), 3]
        output = json.dumps(input, cls=CustomEncoder)
        expected = '[4, [1, 2, 3], {"__type": "nd-array", "__value": [4, 5, 6]}, 3]'
        self.assertEqual(output, expected)


if __name__ == '__main__':
    unittest.main()
