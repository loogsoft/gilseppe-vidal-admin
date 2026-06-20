export interface MessageRequestDto {
  productId: string;
  name: string;
  url: string | string[];
  description: string;
  type: 'esgotado' | 'estoque_baixo';
}
