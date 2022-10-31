import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const checkProduct = updatedCart.find(product => product.id == productId);

      const checkStock = await api.get<Stock>(`/stock/${productId}`);

      const maxAmount = checkStock.data.amount;
      const currentAmountInCart = checkProduct ? checkProduct.amount : 0;
      const newAmount = currentAmountInCart + 1;

      if (newAmount > maxAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (checkProduct) {
        checkProduct.amount = newAmount;
      } else {
        const newProduct = await api.get(`/products/${productId}`);
        updatedCart.push({
          ...newProduct.data,
          amount: 1
        })
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount < 1) {
        throw Error();
      }

      const updatedCart = [...cart];
      const checkProduct = updatedCart.find(product => product.id == productId);

      if (checkProduct) {
        const checkStock = await api.get<Stock>(`/stock/${productId}`);
        const maxAmount = checkStock.data.amount;

        if (amount > maxAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        if (checkProduct) {
          checkProduct.amount = amount;
        } else {
          const newProduct = await api.get(`/products/${productId}`);
          updatedCart.push({
            ...newProduct.data,
            amount: 1
          })
        }

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
