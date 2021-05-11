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

  const updateCart = (newCart: Product[]) => {
    setCart(newCart);
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
  };

  const findProductInCart = (productId: number) => {
    return cart.find((product) => product.id === productId);
  };

  // Tratamento de erros
  const handleInsufficientStock = () =>
    toast.error("Quantidade solicitada fora de estoque");

  const handleErrorAddingProduct = () =>
    toast.error("Erro na adição do produto");

  const handleErrorRemovingProduct = () =>
    toast.error("Erro na remoção do produto");

  const handleErrorUpdatingProductAmount = () =>
    toast.error("Erro na alteração de quantidade do produto");

  const addProduct = async (productId: number) => {
    try {
      let newCart = []; //variável auxiliar

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const productExistsInCart = findProductInCart(productId);

      if (productExistsInCart) {
        if (stock.amount <= productExistsInCart.amount) {
          handleInsufficientStock();
          return;
        }

        newCart = cart.map((product) =>
          product.id === productExistsInCart.id
            ? { ...product, amount: product.amount + 1 }
            : product
        );
      } else {
        if (stock.amount < 1) {
          handleInsufficientStock();
          return;
        }

        // Primeiro desse item no carrinho
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );

        newCart = [...cart, { ...product, amount: 1 }];
      }
      
      updateCart(newCart);
    } catch {
      handleErrorAddingProduct();
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExistsInCart = findProductInCart(productId);

      if (!productExistsInCart) throw Error;

      const newCart = cart.filter((product) => product.id !== productId);

      updateCart(newCart);
    } catch {
      handleErrorRemovingProduct();
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

      const productExistsInCart = findProductInCart(productId);

      if (!productExistsInCart) throw Error;

      const newCart = cart.map((product) => {
        return product.id === productId ? { ...product, amount } : product;
      });

      updateCart(newCart);
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
