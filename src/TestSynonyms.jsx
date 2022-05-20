import './App.css';
import { useEffect, useState } from 'react';
import { useLiveTool } from './lib';

import testSynonymsCss from './TestSynonyms.css';

function App() {
  // set by input field
  const [input, setInput] = useState('');

  // set when 'go' is clicked
  const [word, setWord] = useState(undefined);

  const [data, setData] = useState(undefined);
  useEffect(() => {
    if (!word) { return; }

    fetch(`http://words.bighugelabs.com/api/2/57b1739d4fd2156c72223c9ce7be2958/${word}/json`)
      .then((resp) => resp.json())
      .then(setData);
  }, [word])

  // const [synonyms, setSynonyms] = useState([]);
  // useEffect(() => {
  //   if (!data) { return; }
  //   console.log('i dunno what to do with `data`', data);
  //   setSynonyms(['i dunno', 'what to do']);
  //   // setSynonyms(
  //   //   [...new Set(Object.values(data).map(partOfSpeech => partOfSpeech.syn).flat())]
  //   // )
  // }, [data]);

  let synonyms = useLiveTool({data}, { defaultValue: [], hide: true});
  console.log("syn got", synonyms)

  return (
    <main>
      <style>{testSynonymsCss}</style>
      <header>
        <h1>Synonymizer</h1>
        <p>Circumlocute like a pro!</p>
        <form>
          <input value={input} onChange={(e) => setInput(e.target.value)}/>
          <input type='submit' onClick={(e) => { setWord(input); e.preventDefault() }} value="Go" />
        </form>
      </header>
      <div>
        {synonyms.map((synonym) =>
          <div key={synonym} className="word" style={{transform: `rotate(${Math.random() * 10 - 5}deg)`}}
               onClick={() => { setInput(synonym); setWord(synonym); }}>
            {synonym}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
