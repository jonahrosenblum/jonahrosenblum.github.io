const Engine = Matter.Engine;
const Render = Matter.Render;
const Runner = Matter.Runner;
const MouseConstraint = Matter.MouseConstraint;
const Mouse = Matter.Mouse;
const World = Matter.World;
const Events = Matter.Events;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Bodies = Matter.Bodies;
const Vertices = Matter.Vertices;
const engine = Engine.create();
const world = engine.world;
const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: Math.min(document.documentElement.clientWidth, 1000),
    height: Math.min(document.documentElement.clientHeight, 600),
    //showAxes: true,
    wireframes: false,
    showCollisions: true,
    //showConvexHulls: true
  }
});
// some constants for the organism's bodies
const eaten = 0;
const brain = .25;
const regular = .5
const eye = .75;
const mouth = 1;
const wall = 2;
const numTypes = 6;

// screw you Netwon!
engine.world.gravity.y = 0;
setInterval(function() { Engine.update(engine, 2000 / 60); }, 2000 / 60);

// https://coderwall.com/p/flonoa/simple-string-format-in-javascript
// a useful function which helps format strings.
String.prototype.format = function() {
  let a = this;
  for (k in arguments) {
    a = a.replace("{" + k + "}", arguments[k])
  }
  return a
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
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}


// a basic function I wrote which outputs ~0 for n <= 6 and then ~1 for n > 6.
function specialSigmoid(n) {
  return 1 / (1 + Math.pow(Math.E, 8-n));
}


// this is useful for scaling outputs of NN back up to meaningful values
function inverseSigmoid(n) {
  return (n === 0 || n === 1) ? 0 : Math.log(n / (1 - n));
}


function inverseLinear(n) {
  return -.01 + (n * .02)
  //return n / 100;
}


// https://stackoverflow.com/questions/2450954
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

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


// this is a class which controls and keeps track of each organism's body,
// fitness, and movements.
class Organism {

  constructor(body) {
    this.body = body;
    this.fitness = 0;
    this.eyeIndex1 = -1;
    this.eyeIndex2 = -1;
    this.mouthIndex = 0;
    this.isDead = false;
    for (let i = 0; i < this.body.parts.length; ++i) {
      if (body.parts[i].label === eye && this.eyeIndex1 === -1) {
        this.eyeIndex1 = i;
      } else if (body.parts[i].label === eye){
        this.eyeIndex2 = i;
      } else if (body.parts[i].label === mouth) {
        this.mouthIndex = i;
      }
    }
    this.brain = neataptic.architect.Perceptron(23,30,30,3);
    for (let j = 0; j < this.brain.nodes.length; ++j) {
      this.brain.nodes[j].squash = neataptic.methods.activation.TANH;
    }
    for (let k = 0; k < 500; ++k) {
      this.brain.mutate(neataptic.methods.mutation.MOD_WEIGHT);
      this.brain.mutate(neataptic.methods.mutation.MOD_BIAS);
    }
  }

  getID() {
    return this.id;
  }

  getFitness() {
    return this.fitness;
  }

  eatRegular() {
    this.fitness += 3;
  }

  loseRegular() {
    this.fitness -= 3;
  }

  eatBrain() {
    this.fitness += 10;
  }

  hitWall() {
    this.fitness -= 10;
  }

  getRaycast(eyeIndex) {
    // this list of bodies is useful for raycasting
    const bodies = Composite.allBodies(engine.world);
    // due to an annoying bug, we need to make sure that our organism
    // still exists in the world before doing anything - before this there were
    // phantom organisms shooting out rays
    let itemStillExists = false;
    for (let index = 0; index < bodies.length; ++index) {
      if (bodies[index].id === this.body.id) itemStillExists = true;
    }
    if (!itemStillExists) {
      myPop.pop[this.body.id].isDead = true;
      return [];
    }
    const xMultiplier = Math.cos(this.body.parts[eyeIndex].angle + this.body.angle);
    const yMultiplier = Math.sin(this.body.parts[eyeIndex].angle + this.body.angle);
  
    // const context = render.context;
    // context.beginPath();
    // context.moveTo(this.body.parts[eyeIndex].position.x, this.body.parts[eyeIndex].position.y);
    // context.lineTo(xMultiplier * 1600, yMultiplier*1600);
    // context.lineWidth = 0.5;
    // context.strokeStyle = '#fff';
    // context.stroke();
    const array = raycast(bodies, this.body.parts[eyeIndex].position, 
                          { x: xMultiplier * 1600, 
                            y: yMultiplier * 1600
                          });
    // remove all raycast collisions with the organisms own body
    while(array.last() !== undefined && array.last().body.parent.id === this.body.id) {
      array.pop();
    }
    return array;
            
  }

  getBrainInputs(bodies1, bodies2) {
    if (!this.body || bodies1 === [] || bodies1.last() === undefined) return;
    let brainInputs = [];
    const eyeAngle1 = this.body.parts[this.eyeIndex1].angle - this.body.angle;
    const eyeToMouthAngle1 = this.body.parts[this.mouthIndex].angle - this.body.parts[this.eyeIndex1].angle
    const eyeAngle2 = this.body.parts[this.eyeIndex2].angle - this.body.angle;
    const eyeToMouthAngle2 = this.body.parts[this.mouthIndex].angle - this.body.parts[this.eyeIndex2].angle
    // const numInputs = 23;
    // give inputs for the brain to make a decision about what the next move
    // will be - we will give it the current velocity, current angle relative
    // to what it sees, the angle between the eye and mouth, the distance to 
    // the closest object, and the type of the current object.
    brainInputs.push(Math.sqrt(
                     Math.pow(this.body.velocity.x, 2) +
                     Math.pow(this.body.velocity.y, 2)));
    brainInputs.push(Math.cos(eyeAngle1));
    brainInputs.push(Math.sin(eyeAngle1));
    brainInputs.push(Math.cos(eyeToMouthAngle1));
    brainInputs.push(Math.sin(eyeToMouthAngle1));
    brainInputs.push(Math.cos(eyeAngle2));
    brainInputs.push(Math.sin(eyeAngle2));
    brainInputs.push(Math.cos(eyeToMouthAngle2));
    brainInputs.push(Math.sin(eyeToMouthAngle2));
    brainInputs.push(Math.sqrt(
                     Math.pow(bodies1.last().point.x - this.body.position.x, 2) +
                     Math.pow(bodies1.last().point.y - this.body.position.y, 2) 
                    ) / 600);
    brainInputs.push(Math.sqrt(
                     Math.pow(bodies2.last().point.x - this.body.position.x, 2) +
                     Math.pow(bodies2.last().point.y - this.body.position.y, 2) 
                    ) / 600);
    for (let input = 0; input < numTypes; ++input) {
      brainInputs.push(0);
    }
    let numInputs = 17;
    switch(bodies1.last().body.label) {
      case eaten:
        brainInputs[numInputs - numTypes] = 1;
        console.log('???');
        break;
      case brain:
        brainInputs[numInputs - numTypes + 1] = 1;
        break;
      case regular:
        brainInputs[numInputs - numTypes + 2] = 1;
        break;
      case eye:
        brainInputs[numInputs - numTypes + 3] = 1;
        break;
      case mouth:
        brainInputs[numInputs - numTypes + 4] = 1;
        break;
      case wall:
        brainInputs[numInputs - numTypes + 5] = 1;
        break;
      default:
        console.log("this should never happen");
    }

    for (let input = 0; input < numTypes; ++input) {
      brainInputs.push(0);
    }
    numInputs = 23;
    switch(bodies2.last().body.label) {
      case eaten:
        brainInputs[numInputs - numTypes] = 1;
        break;
      case brain:
        brainInputs[numInputs - numTypes + 1] = 1;
        break;
      case regular:
        brainInputs[numInputs - numTypes + 2] = 1;
        break;
      case eye:
        brainInputs[numInputs - numTypes + 3] = 1;
        break;
      case mouth:
        brainInputs[numInputs - numTypes + 4] = 1;
        break;
      case wall:
        brainInputs[numInputs - numTypes + 5] = 1;
        break;
      default:
        console.log("this should never happen");
    }

    return brainInputs;
  }

  getEaten() {
    this.fitness -= 30;
  }

  nextMovement() {
    const bodies1 = this.getRaycast(this.eyeIndex1);
    const bodies2 = this.getRaycast(this.eyeIndex2);
    if (bodies1 === [] || bodies1 === undefined) {
      return;
    }

    const brainInputs = this.getBrainInputs(bodies1, bodies2);
    //onsole.log(brainInputs);
    if (brainInputs === undefined || brainInputs.length !== 23) return;
    
    const brainOutputs = this.brain.activate(brainInputs);
    
    const forceX = brainOutputs[0] / 200;
    const forceY = brainOutputs[1] / 200
    const torque = brainOutputs[2] / 100;

    Body.applyForce(this.body, this.body.position, {
      x: forceX, 
      y: forceY
    });

    Body.setVelocity(this.body, {
      x: this.body.velocity.x > .1 ? .1 : this.body.velocity.x,
      y: this.body.velocity.y > .1 ? .1 : this.body.velocity.y,
    });
    Body.setVelocity(this.body, {
      x: this.body.velocity.x < -.1 ? -.1 : this.body.velocity.x,
      y: this.body.velocity.y < -.1 ? -.1 : this.body.velocity.y,
    });
    this.body.torque += torque;
  }

  setBrainAndBody(brain) {
    this.brain = neataptic.Network.fromJSON(brain.toJSON());
  }
}


class Population {
  constructor(popSize, numAppendages) {
    this.pop = {};
    this.popSize = popSize;
    this.numAppendages = numAppendages;
  }

  tournamentSelection(myPopList) {
    const tournamentSize = 4;
    
    let bestOrganism = undefined;
    for (let i = 0; i < tournamentSize; ++i) {
      let index = this.popSize;
      while (index === this.popSize) {
        index = Math.floor(getRandomArbitrary(0, this.popSize));
      }
      const randomOrganism = myPopList[index];
      if (bestOrganism === undefined || (randomOrganism.getFitness() > bestOrganism.getFitness())) {
        bestOrganism = randomOrganism;
      }
    }
    return bestOrganism;
  }

  getNewPop() {
    let myPopList = [];
    let mostFit = undefined;
    //let secondMostFit = undefined;
    for (var key in this.pop) {
      if (mostFit === undefined || this.pop[key].getFitness() >= mostFit.getFitness()) {
        //secondMostFit = mostFit;
        mostFit = this.pop[key];
      }
      myPopList.push(this.pop[key]);
    }
    let newPop = [];
    if (mostFit !== undefined) {
      newPop.push(mostFit);
    }
    // if (secondMostFit !== undefined) {
    //   newPop.push(secondMostFit);
    // }
    for (var key in this.pop){
      newPop.push(this.tournamentSelection(myPopList));
    }
    while(newPop.length > this.popSize) {
      newPop.pop();
    }
    return newPop;
  }

  getCoordinates() {
    let coords = []
    for (let x = 150; x < 950; x+= 100) {
      for (let y = 150; y < 550; y += 100) {
        coords.push({'x': x, 'y': y});
      }
    }
    return coords;
  }

  getOrdering(numAppendages) {
    let parts = [brain, eye, mouth, eye];
    for (let i = 0; i < numAppendages - parts.length; ++i) {
      parts.push(regular);
    }
    //return shuffle(parts);
    return parts;
  }
  
  getNBody(numAppendages, x, y) {
    let bodyParts = [];
    const angle = (Math.PI * 2 / numAppendages);
    const angleConst = specialSigmoid(numAppendages) * .2;
    const yCoord1 = 60 - (Math.cos(angle+angleConst) * 10);
    const yCoord2 = 40 + (Math.cos(angle+angleConst) * 10);
    const typesOfParts = this.getOrdering(numAppendages);
    for (let i = 0; i < numAppendages; ++i) {
      const len = getRandomArbitrary(50, 50);
      const coords = '20 {0} 10 50 20 {1} {2} 50'.format(yCoord1, yCoord2, len);
      var corner = Vertices.fromPath(coords);
      let concave = Bodies.fromVertices(x + len/3*Math.cos(i * angle), y + len/3*Math.sin(i * angle), corner);
      if (typesOfParts[i] === mouth) {
        concave.label = mouth;
        concave.render.fillStyle = '#0000FF';
      } else if (typesOfParts[i] === brain) {
        concave.label = brain;
        concave.render.fillStyle = '#C44D58';
      } else if (typesOfParts[i] === eye) {
        concave.label = eye;
        concave.render.fillStyle = '#CCCC00';
      } else {
        concave.label = regular;
        concave.render.fillStyle = '#00CC00';
      }
      Body.rotate(concave, i * angle);
      bodyParts.push(concave);
    }
    const body = Body.create({
      parts: bodyParts,
      // inertia: Infinity,
      friction: .002,
      //friction: 0,
      restitution: 0,
      sleepThreshold: Infinity
    })
    
    return body;
  }

  generatePop() {
    let firstGen = false;
    let newPop = undefined;
    if (this.pop === {}) 
      firstGen = true;
    if (!firstGen) {
      newPop = this.getNewPop();
      //console.log(newPop);
    }
    this.pop = {}
    let coords = this.getCoordinates();
    for (let j = 0; j < this.popSize; ++j) {
      coords = shuffle(coords);
      const bodyCoords = coords.pop();
      const body = this.getNBody(this.numAppendages, bodyCoords.x, bodyCoords.y);
      let organism = new Organism(body);
      this.pop[body.id] = organism;
      if (!firstGen && newPop[0]) {
        const newBrain = newPop[j].brain;
        //console.log(newBrain);
        // for (let weight = 0; weight < newBrain.connections; ++weight) {
        //   newBrain.connections[i].weight += getRandomArbitrary(-1, 1);
        // }
        const weightMutations = Math.floor(getRandomArbitrary(0, 80));
        const biasMutations = Math.floor(getRandomArbitrary(0, 6));
        for (let k = 0; k < weightMutations; ++k) {
          newBrain.mutate(neataptic.methods.mutation.MOD_WEIGHT);
        }
        for (let k = 0; k < biasMutations; ++k) {
          newBrain.mutate(neataptic.methods.mutation.MOD_BIAS);
        }
        
        this.pop[body.id].setBrainAndBody(newPop[j].brain);
      }
    }
  }

  addGenerationToWorld() {
    const bodiesInWorld = Composite.allBodies(engine.world);
    // need to remove all bodies before adding more
    let index = 0;
    for (; index < bodiesInWorld.length; ++index) {
      World.remove(world, bodiesInWorld[index]);
    }
    
    let bodies = [];
    //let coords = this.getCoordinates();
    
    for (var key in this.pop){
      bodies.push(this.pop[key].body);
    }

    const ground = Bodies.rectangle(400, 600, 1200, 20, { isStatic: true });
    ground.label = wall;
    const ceiling = Bodies.rectangle(400, 0, 1200, 20, { isStatic: true });
    ceiling.label = wall;
    const leftWall = Bodies.rectangle(0, 200, 20, 1000, { isStatic: true });
    leftWall.label = wall;
    const rightWall = Bodies.rectangle(1000, 200, 20, 1000, { isStatic: true });
    rightWall.label = wall;
    // const ground = Bodies.rectangle(400, 600, 800, 20, { isStatic: true });
    // ground.label = wall;
    // const ceiling = Bodies.rectangle(400, 0, 800, 20, { isStatic: true });
    // ceiling.label = wall;
    // const leftWall = Bodies.rectangle(0, 200, 20, 800, { isStatic: true });
    // leftWall.label = wall;
    // const rightWall = Bodies.rectangle(800, 200, 20, 800, { isStatic: true });
    // rightWall.label = wall;

    World.add(world, bodies.concat([ground, ceiling, leftWall, rightWall]));
  }

}


Events.on(engine, 'collisionStart', function(event) {
  var pairs = event.pairs;

  for (var i = 0, j = pairs.length; i != j; ++i) {
      var pair = pairs[i];
      //console.log('??');
      // if (myPop.pop[pair.bodyA.parent.id] === undefined ||
      //     myPop.pop[pair.bodyB.parent.id] === undefined) {
      //      continue;
      // }
      //console.log('??');
      if (pair.bodyA.label === mouth && pair.bodyB.label === regular) {
        pair.bodyB.label = eaten;
        pair.bodyB.render.fillStyle = '#D3D3D3';
        myPop.pop[pair.bodyA.parent.id].eatRegular();
        myPop.pop[pair.bodyB.parent.id].loseRegular();
      } else if (pair.bodyB.label === mouth && pair.bodyA.label === regular) {
        pair.bodyA.label = eaten;
        pair.bodyA.render.fillStyle = '#D3D3D3';
        myPop.pop[pair.bodyB.parent.id].eatRegular();
        myPop.pop[pair.bodyA.parent.id].loseRegular();
      } else if (pair.bodyA.label === mouth && pair.bodyB.label === brain) {
        World.remove(world, pair.bodyB.parent);
        myPop.pop[pair.bodyB.parent.id].isDead = true;
        myPop.pop[pair.bodyB.parent.id].getEaten();
        myPop.pop[pair.bodyB.parent.id].fitness += (counter % 1000) / 100;
        myPop.pop[pair.bodyA.parent.id].eatBrain();
      } else if (pair.bodyB.label === mouth && pair.bodyA.label === brain) {
        World.remove(world, pair.bodyA.parent);
        myPop.pop[pair.bodyA.parent.id].isDead = true;
        myPop.pop[pair.bodyA.parent.id].getEaten();
        myPop.pop[pair.bodyA.parent.id].fitness += (counter % 1000) / 100;
        myPop.pop[pair.bodyB.parent.id].eatBrain();
      } else if (pair.bodyB.label === wall) {
        World.remove(world, pair.bodyA.parent);
        myPop.pop[pair.bodyA.parent.id].isDead = true;
        myPop.pop[pair.bodyA.parent.id].fitness += (counter % 1000) / 100;
        myPop.pop[pair.bodyA.parent.id].hitWall();
      } else if (pair.bodyA.label === wall) {
        World.remove(world, pair.bodyB.parent);
        myPop.pop[pair.bodyB.parent.id].isDead = true;
        myPop.pop[pair.bodyB.parent.id].fitness += (counter % 1000) / 100;
        myPop.pop[pair.bodyB.parent.id].hitWall();
      }
  }
});


let counter = 0;
Events.on(engine, 'beforeUpdate', function() {
  if (myPop.pop === undefined) return;
  let popAllDead = false;
  if (counter % 10 === 0) {
    popAllDead = true;
    for (var key in myPop.pop){
      if (myPop !== undefined && !myPop.pop[key].isDead) {
        popAllDead = false;
        var theOrganism = myPop.pop[key];
        theOrganism.nextMovement();
      }
    }
  }
  if (counter % 1000 === 0 || popAllDead) {
    counter = Math.ceil(counter / 1000) * 1000;
    try {
      document.getElementById("gen").innerHTML = "Generation: {0}".format(counter / 1000);
    }
    catch(error) {
      console.error(error);
      // expected output: ReferenceError: nonExistentFunction is not defined
      // Note - error messages will vary depending on browser
    }
    myPop.generatePop();
    myPop.addGenerationToWorld(); 
  }
  counter += 1;
});

let myPop = new Population(20, 4);
//myPop.generatePop();
//myPop.addGeneration();



const mouse = Mouse.create(render.canvas)
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: {
      visible: false
    }
  }
})

World.add(world, mouseConstraint);
render.mouse = mouse;

Matter.Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// var Neuron = synaptic.Neuron,
// 	Layer = synaptic.Layer,
// 	Network = synaptic.Network,
// 	Trainer = synaptic.Trainer,
// 	Architect = synaptic.Architect;

// function Perceptron(input, hidden, hidden2, output)
// {
// 	// create the layers
// 	var inputLayer = new Layer(input);
//   var hiddenLayer = new Layer(hidden);
//   var hiddenLayer2 = new Layer(hidden2);
// 	var outputLayer = new Layer(output);

// 	// connect the layers
//   inputLayer.project(hiddenLayer);
//   hiddenLayer.project(hiddenLayer2);
// 	hiddenLayer2.project(outputLayer);

// 	// set the layers
// 	this.set({
// 		input: inputLayer,
// 		hidden: [hiddenLayer, hiddenLayer2],
// 		output: outputLayer
// 	});
// }

// // extend the prototype chain
// Perceptron.prototype = new Network();
// Perceptron.prototype.constructor = Perceptron;

// var myPerceptron = new Perceptron(2,3,3,1);
// console.log(myPerceptron);
// var myTrainer = new Trainer(myPerceptron);

// myTrainer.XOR(); // { error: 0.004998819355993572, iterations: 21871, time: 356 }

// console.log(myPerceptron.activate([0,0])); // 0.0268581547421616
// console.log(myPerceptron.activate([1,0])); // 0.9829673642853368
// console.log(myPerceptron.activate([0,1])); // 0.9831714267395621
// console.log(myPerceptron.activate([1,1])); // 0.02128894618097928