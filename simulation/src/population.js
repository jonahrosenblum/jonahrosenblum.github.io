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
    const tournamentSize = 3;
    let bestOrganism = undefined;

    for (let i = 0; i < tournamentSize; ++i) {
      let index = myPopList.length;
      // get a random integer that isn't out of the list range
      while (index === myPopList.length) {
        index = Math.floor(getRandom(0, myPopList.length));
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
        case BRAIN:
          inputs[inputs.length - 1] = 1;
          break;
        case REGULAR:
          inputs[inputs.length - 2] = 1;
          break;
        case EYE:
          inputs[inputs.length - 3] = 1;
          break;
        case MOUTH:
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
      // make the mouth a bit more pointy
      if (typesOfParts[i] === MOUTH) {
        const xIntermediate = 45 * (xCoord1 / len1 + xCoord2 / len2) / 2;
        const yIntermediate = 45 * (yCoord1 / len1 + yCoord2 / len2) / 2;
        coords = '0 0 {0} {1} {2} {3} {4} {5} '.format(xCoord1, yCoord1, xIntermediate, yIntermediate, xCoord2, yCoord2);
      }
      var corner = Vertices.fromPath(coords);
      
      let concave = Bodies.fromVertices(x, y , corner);
      if (!concave) {
        console.log(coords);
      }
      if (typesOfParts[i] === MOUTH) {
        concave.label = MOUTH;
        concave.render.fillStyle = '#0000FF';
      } else if (typesOfParts[i] === BRAIN) {
        concave.label = BRAIN;
        concave.render.fillStyle = '#C44D58';
      } else if (typesOfParts[i] === EYE) {
        concave.label = EYE;
        concave.render.fillStyle = '#CCCC00';
      } else {
        concave.label = REGULAR;
        concave.render.fillStyle = '#D3D3D3';
      }
      var centre = Vertices.centre(corner);
      // without this the organism is just a lump of triangles, this makes the spacing correct
      Body.setPosition(concave, {
        x: concave.position.x + centre.x,
        y: concave.position.y + centre.y
      });
      bodyParts.push(concave);
    }
    const body = Body.create({
      parts: bodyParts,
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
    const newBody = this.getNBody(this.numAppendages, replacement.bodyGenerator, 
                                  replacement.order, bodyCoords.x, bodyCoords.y);
    
    const newBrain = neataptic.Network.fromJSON(replacement.organismBrain.toJSON());
    const newBodyGenerator = neataptic.Network.fromJSON(replacement.bodyGenerator.toJSON());
    const newOrder = JSON.parse(JSON.stringify(replacement.order));

    const randIncrement1 = getRandom(0,1) > .5 ? -.005 : .005;
    const randIncrement2 = getRandom(0,1) > .5 ? -.005 : .005;
    let currentBrainMutationRate = this.mutationRateHeritage ? 
                                      replacement.brainMutationRate + randIncrement1 : this.brainMutationRate;
    let currentBodyMutationRate = this.mutationRateHeritage ? 
                                      replacement.bodyMutationRate + randIncrement2 : this.bodyMutationRate;
    currentBrainMutationRate = currentBrainMutationRate < 0 ? 0 : currentBrainMutationRate;
    currentBodyMutationRate = currentBodyMutationRate < 0 ? 0 : currentBodyMutationRate;
    
    newBody.brainMutationRate = currentBrainMutationRate
    newBody.bodyMutationRate = currentBodyMutationRate;
    for (let connection = 0; connection < newBrain.connections.length; ++connection) {
      if (getRandom(0, 1) > 1 - currentBrainMutationRate) {
        newBrain.connections[connection].weight += getRandom(neataptic.methods.mutation.MOD_WEIGHT.min, 
                                                                  neataptic.methods.mutation.MOD_WEIGHT.max);
      }
    }

    for (let node = 0; node < newBrain.nodes.length; ++node) {
      if (getRandom(0, 1) > 1 - currentBrainMutationRate) {
        newBrain.nodes[node].bias += getRandom(neataptic.methods.mutation.MOD_BIAS.min, 
                                                        neataptic.methods.mutation.MOD_BIAS.max);
      }
    }

    for (let connection = 0; connection < newBodyGenerator.connections.length; ++connection) {
      if (getRandom(0, 1) > 1 - currentBodyMutationRate) {
        newBodyGenerator.connections[connection].weight += getRandom(neataptic.methods.mutation.MOD_WEIGHT.min, 
                                                                      neataptic.methods.mutation.MOD_WEIGHT.max);
      }
    }

    for (let node = 0; node < newBodyGenerator.nodes.length; ++node) {
      if (getRandom(0,1) > 1 - currentBodyMutationRate) {
        newBodyGenerator.nodes[node].bias += getRandom(neataptic.methods.mutation.MOD_BIAS.min, 
                                                        neataptic.methods.mutation.MOD_BIAS.max);
      }
    }

    if (getRandom(0,1) > 1 - currentBrainMutationRate) {
      newOrder.randomSwap(newOrder.length);
    }

    let organism = new Organism(newBody, newOrder, newBrain, newBodyGenerator);
    this.pop[newBody.id] = organism;
    this.pop[newBody.id].setMutationRates(currentBrainMutationRate, currentBodyMutationRate);
    World.add(world, newBody);
  }

  generatePop() {
    this.pop = {}
    let coords = this.getCoordinates();
    let order = [BRAIN, EYE, MOUTH, EYE];
    const length = order.length;
    for (let i = 0; i < this.numAppendages - length; ++i) {
      if (i % 3 === 0) {
        order.push(BRAIN);
      } else if (i % 3 === 1) {
        order.push(MOUTH);
      } else {
        order.push(REGULAR);
      }
    }

    for (let i = 0; i < this.popSize; ++i) {
      // for some reason the deep copy doesn't work very well... need to recreate
      // the brain and generator each time :(
      const organismBrain = neataptic.architect.Perceptron(24, 30, 20, 10, 3);
      const bodyGenerator = neataptic.architect.Perceptron(4 * this.numAppendages, 4 * (this.numAppendages + 3), 
                                                          4 * (this.numAppendages+1), this.numAppendages);
      for (let j = 0; j < organismBrain.nodes.length; ++j) {
        // using TANH for the squash so we can get negative values as output
        organismBrain.nodes[j].squash = neataptic.methods.activation.TANH;
      }
      for (let j = 0; j < bodyGenerator.nodes.length; ++j) {
        bodyGenerator.nodes[j].squash = neataptic.methods.activation.TANH;
      }

      // here's where we scramble the brains and body generators, 500 is totally arbitrary
      for (let j = 0; j < 500; ++j) {
        organismBrain.mutate(neataptic.methods.mutation.MOD_WEIGHT);
        organismBrain.mutate(neataptic.methods.mutation.MOD_BIAS);
      }
      for (let j = 0; j < 500; ++j) {
        bodyGenerator.mutate(neataptic.methods.mutation.MOD_WEIGHT);
        bodyGenerator.mutate(neataptic.methods.mutation.MOD_BIAS);
      }

      order = shuffle(order);
      coords = shuffle(coords);
      const bodyCoords = coords.pop();
      const body = this.getNBody(this.numAppendages, bodyGenerator, order, bodyCoords.x, bodyCoords.y);
      let organism = new Organism(body, order, organismBrain, bodyGenerator);
      organism.setMutationRates(this.brainMutationRate, this.bodyMutationRate);
      this.pop[body.id] = organism;
    }
  }

  addGenerationToWorld() {
    const bodiesInWorld = Composite.allBodies(engine.world);
    // need to remove all bodies before adding more
    for (let i = 0; i < bodiesInWorld.length; ++i) {
      World.remove(world, bodiesInWorld[i]);
    }
    
    let newBodies = [];
    
    for (var key in this.pop){
      newBodies.push(this.pop[key].body);
    }

    const ground = Bodies.rectangle(400, 700, 1200, 20, { isStatic: true });
    ground.label = WALL;
    const ceiling = Bodies.rectangle(400, 0, 1200, 20, { isStatic: true });
    ceiling.label = WALL;
    const leftWall = Bodies.rectangle(0, 200, 20, 1000, { isStatic: true });
    leftWall.label = WALL;
    const rightWall = Bodies.rectangle(1000, 200, 20, 1000, { isStatic: true });
    rightWall.label = WALL;

    World.add(world, newBodies.concat([ground, ceiling, leftWall, rightWall]));
  }

}