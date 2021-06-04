/// <reference lib="webworker" />
let array: any = [];
addEventListener('message', ({ data }) => {
  if (data == 'download') {
    const blob = new Blob(array);
    postMessage(blob);
    array = [];
  } else {
    array.push(data);
  }
});
