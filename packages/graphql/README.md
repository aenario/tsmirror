# `@tsmirror/di`

Toy dependency injection container.

## Usage

```ts
import { reflected } from "@tsmirror/reflect";
import { makeContainer } from "../src/container";

interface Padawan {
  name: string;
  isYoung: true;
  fullyTrained: false;
}

interface Jedi {
  name: string;
  isYoung: false;
  fullyTrained: true;
}

function yodaTraining(p: Padawan): Jedi {
  return { name: p.name, isYoung: false, fullyTrained: true };
}

function obiwanRecruiting() : Padawan {
    return { name: "Luke", isYoung: true, fullyTrained: false }
}

const di = makeContainer();
di.register(reflected(yodaTraining));
di.register(reflected(obiwanRecruiting));
di.get(
  reflected(function saveTheGalaxy(p: Jedi) {
    console.log(p);
  })
);
```
