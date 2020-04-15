# `@tsmirror/di`

Toy dependency injection container.

## Usage

```ts
import { reflected } from "@tsmirror/reflect";
import { injectable, resolve } from "../src/container";

interface Padawan {
  name: string;
  fullyTrained: false;
}

interface Jedi {
  name: string;
  fullyTrained: true;
}

injectable(
function yodaTraining(p: Padawan): Jedi {
  return { name: p.name, fullyTrained: true };
})

injectable(
function obiwanRecruiting() : Padawan {
  return { name: "Luke", fullyTrained: false }
})

resolve(
function saveTheGalaxy(p: Jedi) {
  console.log(p.name + 'can save the galaxy');
})
```
