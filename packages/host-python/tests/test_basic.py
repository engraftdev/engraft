import sys
sys.path.append("../engraft")
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

def nd_array_multidimensional_dot(a):
    return engraft.run_engraft(a, "nd_array_multidimensional.json", edit=False)
    
class MyTest(unittest.TestCase):
    def test_wikipedia_extractor(self):
        with open("example_response.json") as json_file:
            data = json.load(json_file)
        
        pages_dict = data['query']['pages']
        page_ids = pages_dict.keys()
        pages_list = [pages_dict[page_id] for page_id in page_ids]
        pages_list.sort(key=lambda x: x['pageid'])

        title2 = pages_list[1]['title']
        title3 = pages_list[2]['title']
        output = wikipedia_extractor(data)
        expected = [title2, title3]
        self.assertEqual(output, expected)

    def test_mixed_type_array(self):
        input = [4, [1, 2, 3], np.array([4, 5, 6]), 3]
        output = mixed_type_array(input)
        expected = input[2]
        np.testing.assert_array_equal(output, expected)

    def test_nd_array_elementwise_add(self):
        input = np.array([1, 2, 3])
        output = nd_array_elementwise_add(input)
        expected = (input + 4)
        np.testing.assert_array_equal(output, expected)

    def test_nd_array_multidimensional_dot(self):
        input = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
        output = nd_array_multidimensional_dot(input)
        expected = np.dot(input, np.array([1, 2, 3]))
        np.testing.assert_array_equal(output, expected)

    def test_decoder(self):
        json_string = '[4, [1, 2, 3], {"__type": "nd-array", "__value": [4, 5, 6]}, 3]'
        output = engraft._CustomDecoder().decode(json_string)
        expected = [4, [1, 2, 3], np.array([4, 5, 6]), 3]
        np.testing.assert_equal(output, expected)

    def test_encoder(self):
        input = [4, [1, 2, 3], np.array([4, 5, 6]), 3]
        output = json.dumps(input, cls=engraft._CustomEncoder)
        expected = '[4, [1, 2, 3], {"__type": "nd-array", "__value": [4, 5, 6]}, 3]'
        self.assertEqual(output, expected)

if __name__ == '__main__':
    unittest.main()