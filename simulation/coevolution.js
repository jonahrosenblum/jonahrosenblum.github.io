function runSimulation(numAppendages, popSize, brainMutationRate, bodyMutationRate, mutationRateHeritage) {
  
  const Engine = Matter.Engine;
  const Render = Matter.Render;
  const Runner = Matter.Runner;
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
      wireframes: false,
      showCollisions: true,
    }
  });

  Matter.Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  // some constants for the organism's bodies
  // const eaten = 0;
  const brain = .25;
  const regular = .5
  const eye = .75;
  const mouth = 1;
  const wall = 2;
  const numTypes = 5;

  // screw you Netwon!
  engine.world.gravity.y = 0;
  setInterval(function() { Engine.update(engine, 1000 / 60); }, 1000 / 60);

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

    constructor(body, order, bodyGenerator, firstGen) {
      this.body = body;
      this.fitness = 0;
      this.eyeIndex1 = -1;
      this.eyeIndex2 = -1;
      this.mouthIndex = 0;
      this.brain = undefined;
      this.bodyGenerator = bodyGenerator;
      this.order = order;
      this.brainMutationRate = .05;
      this.bodyMutationRate = .05;

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
      this.fitness += 100;
    }

    hitWall() {
      this.fitness -=30;
    }

    getRaycast(eyeIndex) {
      // this list of bodies is useful for raycasting
      const bodies = Composite.allBodies(engine.world);
      const xMultiplier = Math.cos(this.body.parts[eyeIndex].angle + this.body.angle);
      const yMultiplier = Math.sin(this.body.parts[eyeIndex].angle + this.body.angle);
      // const context = render.context;
      // context.beginPath();
      // context.moveTo(this.body.parts[eyeIndex].position.x, this.body.parts[eyeIndex].position.y);
      // context.lineTo(xMultiplier * 1E5, yMultiplier * 1E5);
      // context.lineWidth = 0.5;
      // context.strokeStyle = '#fff';
      // context.stroke();
      // why such a large number? smaller numbers don't work for some reason.
      const array = raycast(bodies, this.body.parts[eyeIndex].position, 
                            { x: xMultiplier * 1E5, 
                              y: yMultiplier * 1E5
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
      let numInputs = 17;
      switch(bodies1.last().body.label) {
        // case eaten:
        //   brainInputs[numInputs - numTypes] = 1;
        //   break;
        case brain:
          brainInputs[numInputs - numTypes] = 1;
          break;
        case regular:
          brainInputs[numInputs - numTypes + 1] = 1;
          break;
        case eye:
          brainInputs[numInputs - numTypes + 2] = 1;
          break;
        case mouth:
          brainInputs[numInputs - numTypes + 3] = 1;
          break;
        case wall:
          brainInputs[numInputs - numTypes + 4] = 1;
          break;
        default:
          console.log("this should never happen");
      }

      for (let input = 0; input < numTypes; ++input) {
        brainInputs.push(0);
      }
      numInputs = 22;
      switch(bodies2.last().body.label) {
        // case eaten:
        //   brainInputs[numInputs - numTypes] = 1;
        //   break;
        case brain:
          brainInputs[numInputs - numTypes] = 1;
          break;
        case regular:
          brainInputs[numInputs - numTypes + 1] = 1;
          break;
        case eye:
          brainInputs[numInputs - numTypes + 2] = 1;
          break;
        case mouth:
          brainInputs[numInputs - numTypes + 3] = 1;
          break;
        case wall:
          brainInputs[numInputs - numTypes + 4] = 1;
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

      if (brainInputs === undefined || brainInputs.length !== 22) return;
      
      const brainOutputs = this.brain.activate(brainInputs);
      
      const forceX = brainOutputs[0] / 200;
      const forceY = brainOutputs[1] / 200
      const torque = brainOutputs[2] / 400;

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
      if (this.body.angularVelocity > .05 && torque > 0 ||
          this.body.angularVelocity < -.05 && torque < 0) {
            return;
      }
      // Body.setAngularVelocity(this.body, this.body.angularVelocity > .075 ? .075 : this.body.angularVelocity);
      // Body.setAngularVelocity(this.body, this.body.angularVelocity < -.075 ? -.075 : this.body.angularVelocity);
      // Body.setAngularVelocity(this.body, {
      //   x: this.body.angularVelocity.x > -.1 ? -.1 : this.body.angularVelocity.x,
      //   y: this.body.angularVelocity.y > -.1 ? -.1 : this.body.angularVelocity.y,
      // });
      this.body.torque += torque;
    }

    setBrainAndBody(brain, bodyGenerator) {
      this.brain = brain;
      this.bodyGenerator = bodyGenerator;
    }

    setMutationRates(brainMutationRate, bodyMutationRate) {
      this.brainMutationRate = brainMutationRate;
      this.bodyMutationRate = bodyMutationRate;
    }
  }


  class Population {
    constructor(popSize, numAppendages, brainMutationRate, bodyMutationRate, mutationRateHeritage) {
      this.pop = {};
      this.popSize = popSize;
      this.numAppendages = numAppendages;
      this.brainMutationRate = brainMutationRate;
      this.bodyMutationRate = bodyMutationRate;
      this.mutationRateHeritage = mutationRateHeritage;
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
            console.log("this should never happen");
        }

      }
      const bodyLengths = bodyGenerator.activate(inputs);
      for (let k = 0; k < bodyLengths.length; ++k) {
        bodyLengths[k] *= 7;
      }
      return bodyLengths;
    }
    
    getNBody(numAppendages, bodyGenerator, typesOfParts, x, y) {
      const bodyParts = [];
      const angle = (Math.PI * 2 / numAppendages);
      
      const lengthsOfParts = this.getLengths(bodyGenerator, typesOfParts);
      
      for (let i = 0; i < numAppendages; ++i) {
        const len1 = 30 + lengthsOfParts[i];
        const len2 = 30 + ((i === numAppendages - 1) ? lengthsOfParts[0] : lengthsOfParts[i + 1]);
        const xCoord1 = len1 * Math.cos(angle / 2 + (2 * i * Math.PI / numAppendages));
        const xCoord2 = len2 * Math.cos(angle / 2 + (2 * (i + 1) * Math.PI / numAppendages));
        const yCoord1 = len1 * Math.sin(angle / 2 + (2 * i * Math.PI / numAppendages));
        const yCoord2 = len2 * Math.sin(angle / 2 + (2 * (i + 1) * Math.PI / numAppendages));

        let coords = '0 0 {0} {1} {2} {3} '.format(xCoord1, yCoord1, xCoord2, yCoord2);
        if (typesOfParts[i] === mouth) {
          const xIntermediate = 45 * (xCoord1 / len1 + xCoord2 / len2) / 2;
          const yIntermediate = 45 * (yCoord1 / len1 + yCoord2 / len2) / 2;
          // let unitVector = [-(yCoord2 - yCoord1), (xCoord2 - xCoord1)];
          // const magnitude = Math.sqrt(Math.pow(unitVector[0], 2) +  Math.pow(unitVector[1], 2));
          // unitVector[0] /= magnitude;
          // unitVector[1] /= magnitude;
          // const x3 = xIntermediate - (20 * unitVector[0]);
          // const y3 = yIntermediate - (20 * unitVector[1]);
          
          coords = '0 0 {0} {1} {2} {3} {4} {5} '.format(xCoord1, yCoord1, xIntermediate, yIntermediate, xCoord2, yCoord2);
        }
        var corner = Vertices.fromPath(coords);
        
        let concave = Bodies.fromVertices(x, y , corner);
        if (!concave) {
          console.log(coords);
        }
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
          concave.render.fillStyle = '#D3D3D3';
        }
        var centre = Vertices.centre(corner);
        Body.setPosition(concave, {
          x: concave.position.x + centre.x,
          y: concave.position.y + centre.y
        });
        bodyParts.push(concave);
      }
      const body = Body.create({
        parts: bodyParts,
        //friction: .002,
        friction: 0,
        restitution: 0,
        sleepThreshold: Infinity
      })
      
      return body;
    }

    replaceOrganism(idOfReplaced) {
      delete this.pop[idOfReplaced];
      let myPopList = [];
      for (var key in this.pop) {
        myPopList.push(this.pop[key]);
      }
      const replacement = this.tournamentSelection(myPopList);
      let coords = this.getCoordinates();
      coords = shuffle(coords);
      const bodyCoords = coords.pop();
      const newBody = this.getNBody(this.numAppendages, replacement.bodyGenerator, replacement.order, bodyCoords.x, bodyCoords.y);
      
      const newBrain = neataptic.Network.fromJSON(replacement.brain.toJSON());
      const newBodyGenerator = neataptic.Network.fromJSON(replacement.bodyGenerator.toJSON());
      const newOrder = JSON.parse(JSON.stringify(replacement.order));

      const randIncrement1 = getRandomArbitrary(0,1) > .5 ? -.005 : .005;
      const randIncrement2 = getRandomArbitrary(0,1) > .5 ? -.005 : .005;
      let currentBrainMutationRate = this.mutationRateHeritage ? 
                                       replacement.brainMutationRate + randIncrement1 : this.brainMutationRate;
      let currentBodyMutationRate = this.mutationRateHeritage ? 
                                       replacement.bodyMutationRate + randIncrement2 : this.bodyMutationRate;
      currentBrainMutationRate = currentBrainMutationRate < 0 ? 0 : currentBrainMutationRate;
      currentBodyMutationRate = currentBodyMutationRate < 0 ? 0 : currentBodyMutationRate;
      
      newBody.brainMutationRate = currentBrainMutationRate
      newBody.bodyMutationRate = currentBodyMutationRate;
      for (let weight = 0; weight < newBrain.connections.length; ++weight) {
        if (getRandomArbitrary(0,1) > 1 - currentBrainMutationRate) {
          newBrain.connections[weight].weight += getRandomArbitrary(neataptic.methods.mutation.MOD_WEIGHT.min, 
                                                                    neataptic.methods.mutation.MOD_WEIGHT.max);
        }
      }

      for (let node = 0; node < newBrain.nodes.length; ++node) {
        if (getRandomArbitrary(0,1) > 1 - currentBrainMutationRate) {
          newBrain.nodes[node].bias += getRandomArbitrary(neataptic.methods.mutation.MOD_BIAS.min, 
                                                          neataptic.methods.mutation.MOD_BIAS.max);
        }
      }

      for (let weight = 0; weight < newBodyGenerator.connections.length; ++weight) {
        if (getRandomArbitrary(0,1) > 1 - currentBodyMutationRate) {
          newBodyGenerator.connections[weight].weight += getRandomArbitrary(neataptic.methods.mutation.MOD_WEIGHT.min, 
                                                                        neataptic.methods.mutation.MOD_WEIGHT.max);
        }
      }

      for (let node = 0; node < newBodyGenerator.nodes.length; ++node) {
        if (getRandomArbitrary(0,1) > 1 - currentBodyMutationRate) {
          newBodyGenerator.nodes[node].bias += getRandomArbitrary(neataptic.methods.mutation.MOD_BIAS.min, 
                                                          neataptic.methods.mutation.MOD_BIAS.max);
        }
      }

      if (getRandomArbitrary(0,1) > 1 - currentBrainMutationRate) {
        newOrder.randomSwap(newOrder.length);
      }
      let organism = new Organism(newBody, newOrder, newBodyGenerator, false);
      this.pop[newBody.id] = organism;
      this.pop[newBody.id].setBrainAndBody(newBrain, newBodyGenerator);
      this.pop[newBody.id].setMutationRates(currentBrainMutationRate, currentBodyMutationRate);
      World.add(world, newBody);
    }

    generatePop() {
      this.pop = {}
      let coords = this.getCoordinates();
      let order = [brain, eye, mouth, eye];
      const length = order.length;
      for (let i = 0; i < this.numAppendages - length; ++i) {
        if (i % 3 == 0) {
          order.push(brain);
        } else {
          order.push(regular);
        }
      }

      //console.log(this.numAppendages - order.length, order);
      
      const bodyGenerator = neataptic.architect.Perceptron(4*this.numAppendages, 4*(this.numAppendages+3), 4*(this.numAppendages+1), this.numAppendages);
      for (let j = 0; j < bodyGenerator.nodes.length; ++j) {
        bodyGenerator.nodes[j].squash = neataptic.methods.activation.TANH;
      }

      for (let j = 0; j < this.popSize; ++j) {
        for (let k = 0; k < 500; ++k) {
          bodyGenerator.mutate(neataptic.methods.mutation.MOD_WEIGHT);
          bodyGenerator.mutate(neataptic.methods.mutation.MOD_BIAS);
        }
        order = shuffle(order);
        coords = shuffle(coords);
        const bodyCoords = coords.pop();
        const body = this.getNBody(this.numAppendages, bodyGenerator, order, bodyCoords.x, bodyCoords.y);
        let organism = new Organism(body, order, bodyGenerator, true);
        organism.setMutationRates(this.brainMutationRate, this.bodyMutationRate);
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

      World.add(world, bodies.concat([ground, ceiling, leftWall, rightWall]));
    }

  }

  let myPop = new Population(popSize, numAppendages, brainMutationRate, bodyMutationRate, mutationRateHeritage);
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
        // if (pair.bodyA.label === mouth && pair.bodyB.label === regular) {
        //   pair.bodyB.label = eaten;
        //   pair.bodyB.render.fillStyle = '#D3D3D3';
        //   myPop.pop[pair.bodyA.parent.id].eatRegular();
        //   myPop.pop[pair.bodyB.parent.id].loseRegular();
        // } else if (pair.bodyB.label === mouth && pair.bodyA.label === regular) {
        //   pair.bodyA.label = eaten;
        //   pair.bodyA.render.fillStyle = '#D3D3D3';
        //   myPop.pop[pair.bodyB.parent.id].eatRegular();
        //   myPop.pop[pair.bodyA.parent.id].loseRegular();
        // } else 
        if (pair.bodyA.label === mouth && pair.bodyB.label === brain) {
          World.remove(world, pair.bodyB.parent);
          myPop.pop[pair.bodyB.parent.id].getEaten();
          myPop.pop[pair.bodyA.parent.id].eatBrain();
          myPop.replaceOrganism(pair.bodyB.parent.id);
          eatingDeaths += 1;
        } else if (pair.bodyB.label === mouth && pair.bodyA.label === brain) {
          World.remove(world, pair.bodyA.parent);
          myPop.pop[pair.bodyA.parent.id].getEaten();
          myPop.pop[pair.bodyB.parent.id].eatBrain();
          myPop.replaceOrganism(pair.bodyA.parent.id);
          eatingDeaths += 1;
        } else if (pair.bodyB.label === wall) {
          World.remove(world, pair.bodyA.parent);
          myPop.pop[pair.bodyA.parent.id].hitWall();
          myPop.replaceOrganism(pair.bodyA.parent.id);
          wallDeaths += 1;
        } else if (pair.bodyA.label === wall) {
          World.remove(world, pair.bodyB.parent);
          myPop.pop[pair.bodyB.parent.id].hitWall();
          myPop.replaceOrganism(pair.bodyB.parent.id);
          wallDeaths += 1;
        }
    }
  });


  let counter = 0;
  // const time = new Date()
  let wallDeaths = 0;
  let eatingDeaths = 0;

  Events.on(engine, 'beforeUpdate', function() {
    if (!myPop || !myPop.pop) return;
    let popAllDead = false;
    if (counter % 5 === 0) {
      popAllDead = true;
      for (var key in myPop.pop){
        if (myPop !== undefined) {
          popAllDead = false;
          var theOrganism = myPop.pop[key];
          theOrganism.nextMovement();
          myPop.pop[key].fitness += .1
        }
      }
    }

    if (counter % 1000 === 0 || popAllDead) {
      document.getElementById("gen").innerHTML = "Generation: {0}".format(counter / 1000);
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
      render.canvas.remove();
      engine.events = {}
      runner.events = {}
      World.clear(engine.world);
      Engine.clear(engine);
      return;
    }
  });

}

runSimulation(6, 12, .05, .05, false);

const state = {'numAppendages': 6,
               'popSize': 12,
               'brainMutationRate': .05,
               'bodyMutationRate': .05,
               'reset': false,
               'passOnMutation' : false};
const button = document.getElementById("simulationRunner");
button.addEventListener('click', function(){
  state.reset = true;
  setTimeout(function(){ 
    state.reset = false;
    runSimulation(state.numAppendages, state.popSize, state.brainMutationRate, state.bodyMutationRate, state.passOnMutation); 
  }, 100);
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

const heritageToggle = document.getElementById("heritageToggle");
heritageToggle.addEventListener('click', function(){
  state.passOnMutation = !state.passOnMutation;
});