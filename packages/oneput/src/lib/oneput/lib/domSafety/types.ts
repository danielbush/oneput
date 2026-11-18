export type AttributeValue = string | boolean | ((event: Event) => void);
export type ElementDescription = {
  tag?: string;
  attr?: Record<string, AttributeValue>;
  style?: Partial<CSSStyleDeclaration>;
};
