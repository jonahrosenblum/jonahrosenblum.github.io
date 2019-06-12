const Engine = Matter.Engine;
const Render = Matter.Render;
const Runner = Matter.Runner;
const World = Matter.World;
const Events = Matter.Events;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Bodies = Matter.Bodies;
const Vertices = Matter.Vertices;
const Pairs = Matter.Pairs;

// as far as I can tell, there is no way to have 'friend' classes in js
// and so even though it's bad practice, this will have to be a global variable
let engine = Engine.create();

// some constants for the organism's bodies
const BRAIN = 0;
const REGULAR = 1;
const EYE = 2;
const MOUTH = 3;
const WALL = 4;
const numTypes = 5;

// https://coderwall.com/p/flonoa/simple-string-format-in-javascript
// a useful function which helps format strings.
String.prototype.format = function() {
  let a = this;
  for (k in arguments) {
    a = a.replace("{" + k + "}", arguments[k])
  }
  return a
}

// https://stackoverflow.com/questions/872310
// modified version of this prototype
Array.prototype.randomSwap = function (size) {
  const randomIndex1 = Math.floor(Math.random() * size);
  const randomIndex2 = Math.floor(Math.random() * size);
  var intermediate = this[randomIndex1];
  this[randomIndex1] = this[randomIndex2];
  this[randomIndex2] = intermediate;
  return this;
}


// https://stackoverflow.com/questions/9050345
// saves me some ugly code
if (!Array.prototype.last){
  Array.prototype.last = function(){
    return this[this.length - 1];
  };
};


// https://stackoverflow.com/questions/1527803
// returns a random number in range [min, max).
function getRandom(min, max) { 
  return Math.random() * (max - min) + min;
}

// used to change the size of the mutations made over time
function degeneration(n) {
  return Math.pow(Math.E, -Math.pow(-(n / 100), 2));
}

// https://stackoverflow.com/questions/2450954
function shuffle(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// https://stackoverflow.com/questions/135448
function has(object, key) {
  return object ? hasOwnProperty.call(object, key) : false;
}
