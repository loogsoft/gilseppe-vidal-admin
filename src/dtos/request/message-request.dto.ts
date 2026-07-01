export interface MessageRequestDto {
  productId: string;
  name: string;
  url?: string;
  description: string;
  type: 'esgotado' | 'estoque_baixo';
}
