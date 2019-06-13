# An Explanation of the Simulation
## Running the Simulation
- If you want to see a live demo just go to https://jonahrosenblum.com/simulation. 
- If you want to run it yourself:
1. Clone/Download this repo.
2. cd into it (e.g. `cd Desktop/coevolution`).
3. Run a simple http server on your local host with something like `python2 -m SimpleHTTPServer` or `python3 -m http.server`.
4. Open up local host 8000 or whichever port you specified.
5. Enjoy.
## Background
- Originally a final project for a class at University of Michigan (CMPLXSYS 425: Evolution in Silico), this retuned and vastly improved simulation shows how mind and body can evolve in conjunction with one another. 
- In this simulation each organism has one [artificial neural network](https://en.wikipedia.org/wiki/Artificial_neural_network) (ANN) which controls its movement (like a brain) and another ANN which decides the shape of its body.
## Organisms and the Environment
- Each organism is made up of a certain number of 'appendages' which is how many section it is broken up into. These sections can be different lengths, and all serve unique purposes. Here is an image for reference  
![Reference Photo](https://github.com/jonahrosenblum/coevolution/blob/master/photos/explanation.png)  
- Each yellow section is an 'eye.' This is the main source of information input to the organism's brain, and informs the organism on how it should move. Before it decides where to move, the organism will look out of its eye to see what is the closest organism/wall to it, and some other factors like current speed and angle. 
- Of course the organism needs a way to eat, which is why it can have one or many 'mouths' - the blue sections on the organism. If an organism touches its mouth to another organism's red section (the brain), then the eater will consume the other organism - increasing the fitness of the eater and killing the eaten organism. 
- It is worth noting that I have made the mouth sections slightly pointy because otherwise it can be hard for the organisms to eat each other. 
- The white/grey sections don't do anything, they are parts of the organism's body that can be used to help create some interesting body structures.
### Walls
- If an organism touches the wall at any point, it will die instantly. The reason for this has to do with some frustrating results I was getting when I first started this project. In the beginning, organisms would just run headfirst at the walls, sticking their brains into a corner and causing both a huge headache and uninteresting results. 
- I tried to penalize organisms for touching the walls by lowering their fitness, but that just made them try to die as quickly as possible so that their fitness wouldn't be lowered by touching the walls. Finally, I decided that the walls must be avoided altogether. I now enjoy the added layer of complexity this brings to the evolution process, so I don't think this is a feature I will change.

## Reproduction
- There is a maximum capacity for how many organisms can be alive at the same time, and as soon as an organism dies one will be 'born' to take its place. 
- Each new organism will be a descendant of an alive organism. 
- Choosing which organism gets to reproduce is done with [tournament selection](https://en.wikipedia.org/wiki/Tournament_selection), where organism with a higher fitness value are more likely to be selected to reproduce. 
- Fitness is determined by how long an organism has been alive and how many other organisms it has eaten. 
- Each time an organism reproduces mutations will randomly occur to nodes and connections in both ANNs - the rate of mutation can be different for the brain and the body.

## User Options
- The user can change a lot of variables in the simulation, here is an explanation about what each one does
- *Note: you **MUST** hit the 'Reset Simulation' button at the top if you want the changes you have made to the sliders/fields to go into effect, the only button which works in time is speeding up/slowing down the simulation.*
- **Number of Appendages on Organism:** This slider is a lot of fun, you can set the number of sections that the organism's body will be made up of with a minimum of 4 and a maximum of 30 (warning, the more appendages you add the slower the simulation will become).
- **Population Size:** This slider sets the number of organisms in the simulation with a minimum of 2 and a maximum of 30 (warning, like before the more organisms you put into the simulation the slower it will become - this one is even more obvious)
- **Brain Mutation Rate:** This number is the probability that a mutation will occur in the brain each time an organism reproduces.
- **Body Mutation Rate:** This number is the probability that a mutation will occur in the body each time an organism reproduces.
- **Mutation Rate Hereditary:** This one is a bit more complicated. By default, the body and brain mutation rates that you set will not change. However, if this toggle switch is turned on, each offspring will either have a slightly higher or lower mutation rate than it's parent. These offspring will then pass on a slightly higher or lower mutation rate to their offspring and so on so forth. This feature was something I implemented for my class project because I was running an experiment in how the body and brain mutation rate changed over time and in relation to each other. You may not see any dramatic difference by turning on this feature, but know that stuff is happening under the hood. If you want to talk more about this concept and the results I got from my experiment send me an email at jonaher@umich.edu.
- **Speed Up/Reset:** If you speed up the simulation, it will run faster. Pretty self-explanatory. Pressing the reset button will set the speed of the simulation back to the default. As far as I can tell, this speed up mechanic does not affect the evolution process in any way that differs from if the simulation is run at a normal speed the whole time.

