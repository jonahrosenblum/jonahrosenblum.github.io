function addEvents(engine, myPop) {
  Events.on(engine, 'collisionStart', function(event) {
    var pairs = event.pairs;
    for (var i = 0, j = pairs.length; i != j; ++i) {
        var pair = pairs[i];
        if ((!has(myPop.pop, pair.bodyA.parent.id) && pair.bodyA.label != WALL) ||
            (!has(myPop.pop, pair.bodyB.parent.id) && pair.bodyB.label != WALL)) {
          continue;
        }
        
        if (pair.bodyA.label === MOUTH && pair.bodyB.label === BRAIN) {
          World.remove(world, pair.bodyB.parent);
          myPop.pop[pair.bodyA.parent.id].eatBrain();
          myPop.replaceOrganism(pair.bodyB.parent.id);
        } else if (pair.bodyB.label === MOUTH && pair.bodyA.label === BRAIN) {
          World.remove(world, pair.bodyA.parent);
          myPop.pop[pair.bodyB.parent.id].eatBrain();
          myPop.replaceOrganism(pair.bodyA.parent.id);
        } else if (pair.bodyB.label === WALL) {
          World.remove(world, pair.bodyA.parent);
          myPop.replaceOrganism(pair.bodyA.parent.id);
        } else if (pair.bodyA.label === WALL) {
          World.remove(world, pair.bodyB.parent);
          myPop.replaceOrganism(pair.bodyB.parent.id);
        }
    }
  });

  let counter = 0;

  Events.on(engine, 'beforeUpdate', function() {
    if (!myPop || !myPop.pop) return;
    if (counter % 5 === 0) {
      for (var key in myPop.pop){
        if (myPop !== undefined) {
          var theOrganism = myPop.pop[key];
          theOrganism.nextMovement();
          myPop.pop[key].survivalBonus();
        }
      }
    }

    if (counter % 1000 === 0) {
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
      Runner.stop(runner);
      Render.stop(render);
      return;
    }
  });
}

function runSimulation(numAppendages, popSize, brainMutationRate, bodyMutationRate, mutationRateHeritage) {

  engine = Engine.create();
  world = engine.world;

  engine.world.gravity.y = 0;
  render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: Math.min(document.documentElement.clientWidth, 1000),
      height: Math.min(document.documentElement.clientHeight, 700),
      wireframes: false,
      showCollisions: false,
    }
  });
  

  Matter.Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);

  myPop = new Population(popSize, numAppendages, brainMutationRate, bodyMutationRate, mutationRateHeritage);
  myPop.generatePop();
  myPop.addGenerationToWorld();
  
  addEvents(engine, myPop);

  engineBackUp = Matter.Common.clone(engine);
}

// run the simulation with the default values
runSimulation(8, 12, .05, .05, false);


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

let intervals = [];

const speedUpButton = document.getElementById("speedUpButton");
speedUpButton.addEventListener('click', function() {
  intervals.push(setInterval(() => Matter.Engine.update(engine, 1000 / 60), 1000 / 60));
});

const slowDownButton = document.getElementById("slowDownButton");
slowDownButton.addEventListener('click', function() {
  intervals.forEach((interval) => clearInterval(interval));
});