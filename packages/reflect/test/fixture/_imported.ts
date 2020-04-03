export class SecretClass {
    name: string
    constructor(name: string) {this.name = name}
}

export interface A {
    prop: string
    someClass: SecretClass
}