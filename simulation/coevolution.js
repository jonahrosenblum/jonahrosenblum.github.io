function runSimulation(numAppendages, popSize, brainMutationRate, bodyMutationRate) {
  // if the reset button is pressed, remove the old simulation
  // const canvas = document.getElementsByTagName("canvas")[0];
  // if (canvas) {
  //   canvas.parentNode.removeChild(canvas);
  // }
  
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
      height: Math.min(document.documentElement.clientHeight, 700),
      //showAxes: true,
      wireframes: false,
      showCollisions: true,
      //showConvexHulls: true
    }
  });

  // World.add(world, mouseConstraint);
  // render.mouse = mouse;

  Matter.Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

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
  function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }


  // a basic function I wrote which outputs ~0 for n <= 6 and then ~1 for n > 6.
  function specialSigmoid(n) {
    return 1 / (1 + Math.pow(Math.E, 8-n));
  }


  // used to change the size of the mutations made over time
  function degeneration(n) {
    return Math.pow(Math.E, -Math.pow(-(n/100),2));
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

  // https://stackoverflow.com/questions/135448
  function has(object, key) {
    return object ? hasOwnProperty.call(object, key) : false;
  }


  // this is a class which controls and keeps track of each organism's body,
  // fitness, and movements.
  class Organism {

    constructor(body, numAppendages, firstGen) {
      this.body = body;
      this.fitness = 0;
      this.eyeIndex1 = -1;
      this.eyeIndex2 = -1;
      this.mouthIndex = 0;
      this.isDead = false;
      this.brain = undefined;
      this.bodyGenerator = undefined;
      this.order = [];
      for (let i = 0; i < this.body.parts.length; ++i) {
        if (body.parts[i].label === eye && this.eyeIndex1 === -1) {
          this.eyeIndex1 = i;
        } else if (body.parts[i].label === eye){
          this.eyeIndex2 = i;
        } else if (body.parts[i].label === mouth) {
          this.mouthIndex = i;
        }
      }
      if (firstGen) {
        this.brain = neataptic.architect.Perceptron(24,30,20,10,3);
        for (let j = 0; j < this.brain.nodes.length; ++j) {
          this.brain.nodes[j].squash = neataptic.methods.activation.TANH;
        }
        for (let k = 0; k < 500; ++k) {
          this.brain.mutate(neataptic.methods.mutation.MOD_WEIGHT);
          this.brain.mutate(neataptic.methods.mutation.MOD_BIAS);
        }
        this.bodyGenerator = neataptic.architect.Perceptron(4*numAppendages, 4*(numAppendages+3), 4*(numAppendages+1), numAppendages);
        for (let j = 0; j < this.bodyGenerator.nodes.length; ++j) {
          this.bodyGenerator.nodes[j].squash = neataptic.methods.activation.TANH;
        }
        for (let k = 0; k < 500; ++k) {
          this.bodyGenerator.mutate(neataptic.methods.mutation.MOD_WEIGHT);
          this.bodyGenerator.mutate(neataptic.methods.mutation.MOD_BIAS);
        }
        this.order = [brain, eye, mouth, eye];

        for (let i = 0; i < numAppendages - 4; ++i) {
          this.order.push(regular);
        }
        this.order = shuffle(this.order);
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
      this.fitness += 20;
    }

    hitWall() {
      this.fitness -=30;
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
      
      // magnitude of velocity
      brainInputs.push(Math.sqrt(
                      Math.pow(this.body.velocity.x, 2) +
                      Math.pow(this.body.velocity.y, 2)));
      // angular velocity
      brainInputs.push(this.body.angularVelocity);
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
      let numInputs = 18;
      switch(bodies1.last().body.label) {
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

      for (let input = 0; input < numTypes; ++input) {
        brainInputs.push(0);
      }
      numInputs = 24;
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
      if (brainInputs === undefined || brainInputs.length !== 24) return;
      
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

    setBrainAndBody(brain, bodyGenerator, order) {
      this.brain = brain;
      this.bodyGenerator = bodyGenerator;
      this.order = order;
    }
  }


  class Population {
    constructor(popSize, numAppendages, brainMutationRate, bodyMutationRate) {
      this.pop = {};
      this.popSize = popSize;
      this.numAppendages = numAppendages;
      this.brainMutationRate = brainMutationRate;
      this.bodyMutationRate = bodyMutationRate;
    }

    tournamentSelection(myPopList) {
      const tournamentSize = 4;
      
      let bestOrganism = undefined;
      for (let i = 0; i < tournamentSize; ++i) {
        let index = myPopList.length;
        if (index === 0) {
          return undefined;
        }
        while (index === myPopList.length) {
          index = Math.floor(getRandomArbitrary(0, myPopList.length));
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
        for (let y = 150; y < 650; y += 100) {
          coords.push({'x': x, 'y': y});
        }
      }
      return coords;
    }

    getLengths(bodyGenerator, typesOfParts) {
      let inputs = [];
      for (let i = 0; i < typesOfParts.length; ++i) {
        for (let j = 0; j < 4; ++j) {
          inputs.push(0);
        }
        switch(typesOfParts[i]) {
          case brain:
            inputs[inputs.length - 1] = 1;
            break;
          case regular:
            inputs[inputs.length - 2] = 1;
            break;
          case eye:
            inputs[inputs.length - 3] = 1;
            break;
          case mouth:
            inputs[inputs.length - 4] = 1;
            break;
          default:
            console.log(typesOfParts[i]);
            console.log("this should never happen");
        }

      }
      const bodyLengths = bodyGenerator.activate(inputs);
      for (let k = 0; k < bodyLengths.length; ++k) {
        bodyLengths[k] *= 10;
      }
      return bodyLengths;
    }
    
    getNBody(numAppendages, bodyGenerator, typesOfParts, x, y) {
      const bodyParts = [];
      const angle = (Math.PI * 2 / numAppendages);
      const angleConst = specialSigmoid(numAppendages) * .2;
      const yCoord1 = 60 - (Math.cos(angle+angleConst) * 10);
      const yCoord2 = 40 + (Math.cos(angle+angleConst) * 10);
      const lengthsOfParts = this.getLengths(bodyGenerator, typesOfParts);
      for (let i = 0; i < numAppendages; ++i) {
        const len = 50 + Math.floor(lengthsOfParts[i]);
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

    replaceOrganism(idOfReplaced) {
      delete this.pop[idOfReplaced];
      let myPopList = [];
      for (var key in this.pop) {
        if (!this.pop[key].isDead) {
          myPopList.push(this.pop[key]);
        }
      }
      const replacement = this.tournamentSelection(myPopList);
      let coords = this.getCoordinates();
      coords = shuffle(coords);
      const bodyCoords = coords.pop();
      const newBody = this.getNBody(this.numAppendages, replacement.bodyGenerator, replacement.order, bodyCoords.x, bodyCoords.y);
      let organism = new Organism(newBody, this.numAppendages, false);
      this.pop[newBody.id] = organism;
      const newBrain = neataptic.Network.fromJSON(replacement.brain.toJSON());
      const newBodyGenerator = neataptic.Network.fromJSON(replacement.bodyGenerator.toJSON());
      const newOrder = JSON.parse(JSON.stringify(replacement.order));

      for (let weight = 0; weight < newBrain.connections.length; ++weight) {
        if (getRandomArbitrary(0,1) > 1 - this.brainMutationRate) {
          newBrain.connections[weight].weight += getRandomArbitrary(neataptic.methods.mutation.MOD_WEIGHT.min, 
                                                                    neataptic.methods.mutation.MOD_WEIGHT.max);
        }
      }

      for (let node = 0; node < newBrain.nodes.length; ++node) {
        if (getRandomArbitrary(0,1) > 1 - this.brainMutationRate) {
          newBrain.nodes[node].bias += getRandomArbitrary(neataptic.methods.mutation.MOD_BIAS.min, 
                                                          neataptic.methods.mutation.MOD_BIAS.max);
        }
      }

      for (let weight = 0; weight < newBodyGenerator.connections.length; ++weight) {
        if (getRandomArbitrary(0,1) > 1 - this.bodyMutationRate) {
          newBodyGenerator.connections[weight].weight += getRandomArbitrary(neataptic.methods.mutation.MOD_WEIGHT.min, 
                                                                        neataptic.methods.mutation.MOD_WEIGHT.max);
        }
      }

      for (let node = 0; node < newBodyGenerator.nodes.length; ++node) {
        if (getRandomArbitrary(0,1) > 1 - this.bodyMutationRate) {
          newBodyGenerator.nodes[node].bias += getRandomArbitrary(neataptic.methods.mutation.MOD_BIAS.min, 
                                                          neataptic.methods.mutation.MOD_BIAS.max);
        }
      }

      if (getRandomArbitrary(0,1) > 1 - this.bodyMutationRate) {
        newOrder.randomSwap(newOrder.length);
      }
      
      this.pop[newBody.id].setBrainAndBody(newBrain, newBodyGenerator, newOrder);
      World.add(world, newBody);
    }

    generatePop() {
      let firstGen = false;
      let newPop = undefined;
      if (this.pop === {}) 
        firstGen = true;
      if (!firstGen) {
        newPop = this.getNewPop();
      }
      this.pop = {}
      let coords = this.getCoordinates();
      const order = [brain, eye, mouth, eye];
      for (let i = 0; i < this.numAppendages - order.length; ++i) {
        order.push(regular);
      }
      const bodyGenerator = neataptic.architect.Perceptron(4*this.numAppendages, 4*(this.numAppendages+3), 4*(this.numAppendages+1), this.numAppendages);
      for (let j = 0; j < this.popSize; ++j) {
        coords = shuffle(coords);
        const bodyCoords = coords.pop();
        const body = this.getNBody(this.numAppendages, bodyGenerator, order, bodyCoords.x, bodyCoords.y);
        let organism = new Organism(body, this.numAppendages, true);
        this.pop[body.id] = organism;
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

      const ground = Bodies.rectangle(400, 700, 1200, 20, { isStatic: true });
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


  let myPop = new Population(popSize, numAppendages, brainMutationRate, bodyMutationRate);
  myPop.generatePop();
  myPop.addGenerationToWorld();

  Events.on(engine, 'collisionStart', function(event) {
    var pairs = event.pairs;
    for (var i = 0, j = pairs.length; i != j; ++i) {
        var pair = pairs[i];
        if ((!has(myPop.pop, pair.bodyA.parent.id) && pair.bodyA.label != wall) ||
            (!has(myPop.pop, pair.bodyB.parent.id) && pair.bodyB.label != wall)) {
          continue;
        }
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
          //myPop.pop[pair.bodyB.parent.id].fitness += (counter - myPop.pop[pair.bodyB.parent.id].timeAdded) / 100;
          myPop.pop[pair.bodyA.parent.id].eatBrain();
          myPop.replaceOrganism(pair.bodyB.parent.id);
          eatingDeaths += 1;
        } else if (pair.bodyB.label === mouth && pair.bodyA.label === brain) {
          World.remove(world, pair.bodyA.parent);
          myPop.pop[pair.bodyA.parent.id].isDead = true;
          myPop.pop[pair.bodyA.parent.id].getEaten();
          //myPop.pop[pair.bodyA.parent.id].fitness += (counter - myPop.pop[pair.bodyA.parent.id].timeAdded) / 100;
          myPop.pop[pair.bodyB.parent.id].eatBrain();
          myPop.replaceOrganism(pair.bodyA.parent.id);
          eatingDeaths += 1;
        } else if (pair.bodyB.label === wall) {
          World.remove(world, pair.bodyA.parent);
          myPop.pop[pair.bodyA.parent.id].isDead = true;
          //myPop.pop[pair.bodyA.parent.id].fitness += (counter - myPop.pop[pair.bodyA.parent.id].timeAdded) / 100;
          myPop.pop[pair.bodyA.parent.id].hitWall();
          myPop.replaceOrganism(pair.bodyA.parent.id);
          wallDeaths += 1;
        } else if (pair.bodyA.label === wall) {
          World.remove(world, pair.bodyB.parent);
          myPop.pop[pair.bodyB.parent.id].isDead = true;
          //myPop.pop[pair.bodyB.parent.id].fitness += (counter - myPop.pop[pair.bodyB.parent.id].timeAdded) / 100;
          myPop.pop[pair.bodyB.parent.id].hitWall();
          myPop.replaceOrganism(pair.bodyB.parent.id);
          wallDeaths += 1;
        }
    }
  });


  let counter = 0;
  let wallDeaths = 0;
  let eatingDeaths = 0;

  Events.on(engine, 'beforeUpdate', function() {
    if (!myPop || !myPop.pop) return;
    let popAllDead = false;
    if (counter % 10 === 0) {
      popAllDead = true;
      for (var key in myPop.pop){
        if (myPop !== undefined && !myPop.pop[key].isDead) {
          popAllDead = false;
          var theOrganism = myPop.pop[key];
          theOrganism.nextMovement();
          myPop.pop[key].fitness += .1
        }
      }
    }
    if (counter % 1000 === 0 || popAllDead) {
      document.getElementById("gen").innerHTML = "Generation: {0}".format(counter / 1000);
      console.log("Wall deaths: {0}\nEating deaths: {1}\nTotal deaths: {2}".format(wallDeaths / (wallDeaths + eatingDeaths),
      eatingDeaths / (wallDeaths + eatingDeaths), wallDeaths + eatingDeaths));
      eatingDeaths = 0;
      wallDeaths = 0;
      const degen = degeneration(counter / 1000) + .1;
      neataptic.methods.mutation.MOD_WEIGHT.min = -degen;
      neataptic.methods.mutation.MOD_WEIGHT.max = degen;
      neataptic.methods.mutation.MOD_BIAS.min = -degen;
      neataptic.methods.mutation.MOD_BIAS.max = degen;
    }
    counter += 1;
  });

  Events.on(runner, "afterTick", function() {
    if (state.reset) {
      console.log('abc');
      console.log(engine.events);
      render.canvas.remove();
      engine.events = {}
      runner.events = {}
      World.clear(engine.world);
      Engine.clear(engine);
      return;
    }
  });


  // const mouse = Mouse.create(render.canvas)
  // const mouseConstraint = MouseConstraint.create(engine, {
  //   mouse: mouse,
  //   constraint: {
  //     stiffness: 0.2,
  //     render: {
  //       visible: false
  //     }
  //   }
  // })
}

runSimulation(6, 10, .05, .05);

const state = {'numAppendages': 6,
               'popSize': 10,
               'brainMutationRate': .05,
               'bodyMutationRate': .05,
               'reset': false};
const button = document.getElementById("simulationRunner");
button.addEventListener('click', function(){
  state.reset = true;
  setTimeout(function(){ 
    state.reset = false;
    runSimulation(state.numAppendages, state.popSize); 
  }, 100);
  //state.reset = false;
  
  //document.body.innerHTML += '<br><br><a href="/">Back to home page</a>';
});

const appendagesSlider = document.getElementById("numAppendagesSlider");
appendagesSlider.addEventListener('click', function(){
  state.numAppendages = Number(appendagesSlider.value);
  document.getElementById("appenValue").innerHTML = "Current value: {0}".format(state.numAppendages);
});

const popSizeSlider = document.getElementById("popSizeSlider");
popSizeSlider.addEventListener('click', function() {
  state.popSize = Number(popSizeSlider.value);
  document.getElementById("popSize").innerHTML = "Current value: {0}".format(state.popSize);
});

const brainMutationInput = document.getElementById("brainMutationRate");
brainMutationInput.addEventListener('input', function(){
  const newMutation = brainMutationInput.value;
  if (newMutation > 1 || newMutation < 0) {
    state.brainMutationRate = .05;
    brainMutationInput.value = .05;
  }
  state.brainMutationRate = Number(brainMutationInput.value);
});

const bodyMutationInput = document.getElementById("bodyMutationRate");
bodyMutationInput.addEventListener('input', function(){
  const newMutation = bodyMutationInput.value;
  if (newMutation > 1 || newMutation < 0) {
    state.bodyMutationRate = .05;
    bodyMutationInput.value = .05;
  }
  state.bodyMutationRate = Number(bodyMutationInput.value);
});