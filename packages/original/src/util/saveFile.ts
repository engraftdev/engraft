export function saveFile (contents: Blob, fileName: string) {
  let dummyLink = document.createElement("a")
  dummyLink.href = URL.createObjectURL(contents)
  dummyLink.download = fileName
  dummyLink.click()
  URL.revokeObjectURL(dummyLink.href);
}

// can make Blob from contents with
//   new Blob([contents], {type})
// type is something funky like "application/json;charset=utf-8"