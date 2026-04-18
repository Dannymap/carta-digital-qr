import { useState, useEffect } from 'react'
import { getProductsByCategory } from '../services/products'

export function useProducts(categoryId) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!categoryId) return
    setLoading(true)
    setError(null)
    getProductsByCategory(categoryId)
      .then(setProducts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [categoryId])

  return { products, loading, error }
}
