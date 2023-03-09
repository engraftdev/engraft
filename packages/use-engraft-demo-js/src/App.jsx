import { registerAllTheTools } from '@engraft/all-the-tools';
import { useEngraft } from '@engraft/use-engraft';
import { useEffect, useState } from 'react';

import css from './App.css?inline';

registerAllTheTools();

export function App() {
  // set by input field
  const [input, setInput] = useState('');

  // set when 'go' is clicked
  const [word, setWord] = useState(undefined);

  // set by fetch
  const [response, setResponse] = useState(undefined);
  useEffect(() => {
    if (!word) { return; }

    fetch(`http://words.bighugelabs.com/api/2/57b1739d4fd2156c72223c9ce7be2958/${word}/json`)
      .then((resp) => resp.json())
      .then(setResponse);
  }, [word])

  // set by TBD processing
  // let synonyms = ["synonyms", "not", "extracted", "yet"];
  let synonyms = useEngraft({response}, { defaultValue: [], hide: false});
  console.log("synonyms", synonyms)

  return (
    <main>
      <style>{css}</style>
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
