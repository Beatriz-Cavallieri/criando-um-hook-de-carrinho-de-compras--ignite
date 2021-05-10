import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  // Tratamento de erros
  const handleInsufficientStock = () =>
    toast.error("Quantidade solicitada fora de estoque");

  const handleErrorAddingProduct = () =>
    toast.error("Erro na adição do produto");

  // const handleErrorRemovingProduct = () =>
  //   toast.error("Erro na remoção do produto");

  const handleErrorUpdatingProductAmount = () =>
    toast.error("Erro na alteração de quantidade do produto");

  const addProduct = async (productId: number) => {
    try {
      let updatedCart = cart; //variável auxiliar

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const productAlreadyInCart = cart.find(
        (product) => product.id === productId
      );

      if (productAlreadyInCart) {
        // Verificar se tem estoque disponível: itens no estoque > no carrinho
        if (stock.amount > productAlreadyInCart.amount) {
          updatedCart = cart.map((product) =>
            product.id === productAlreadyInCart.id
              ? { ...product, amount: product.amount + 1 }
              : product
          );
        } else {
          handleInsufficientStock();
          return;
        }
      } else {
        // Primeiro desse item no carrinho
        if (stock.amount > 0) {
          const { data: product } = await api.get<Product>(
            `/products/${productId}`
          );
          updatedCart = [...cart, { ...product, amount: 1 }];
        } else {
          handleInsufficientStock();
          return;
        }
      }
      // Atualizar estado
      setCart(updatedCart);
      // Perpetuar valor no localStorage
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      handleErrorAddingProduct();
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // TODO
    } catch {
      // TODO
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount < amount) {
        handleInsufficientStock();
        return;
      }

      const productAlreadyInCart = cart.find(
        (product) => product.id === productId
      );

      if (!productAlreadyInCart) throw Error;

      const updatedCart = cart.map((product) => {
        return product.id === productId ? { ...product, amount } : product;
      });

      setCart(updatedCart);
    } catch {
      handleErrorUpdatingProductAmount();
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
