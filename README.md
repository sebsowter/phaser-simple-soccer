# Phaser 3 Simple Soccer

An implementation of Chapter 4: Programming Game AI by Example by Mat Buckland using Phaser 3.

## Motivation

I am considering developing a sports game based on The Bitmap Brothers's 1988 game Speedball 2. The main challenge in any team based sports game is convincing player AI and so tackling this seemed a good place to start. That naturally led me to the book Programming Game AI by Example by Mat Buckland. so I decide to implement that using Phaser 3.

## Deviations

The book covers the development of a custom physics engine. As we are using Phaser it has it's own physics system. in this case Arcade Physic so we can utilise that instead of creating our own.
Phaser also has it's own Vector2 class, with handy methods for adding, subtracting, normalising and calculating the dot product, so we can use these in-built methods.
I have not created a state machine, rather I am leveraging Phaser's preUpdate and setState methods.

## Next Steps

At present the players have no linear velocity acceleration or deceleration and no angular velocity acceleration or deceleration.

## Installation

Ensure you have [Node.js](https://nodejs.org) installed.

Clone this repo and `cd` to project directory.

```
npm i
```

## Tasks

Run the development server.

```
npm start
```

Create a production build.

```
npm run build
```
