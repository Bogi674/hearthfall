// Player command queue. UI pushes commands here and the world applies them at the start of a tick.
// The union is empty until a milestone adds the first player action (placement arrives in M2).

export type Command = never;

export function pushCommand(queue: Command[], command: Command): void {
  queue.push(command);
}
