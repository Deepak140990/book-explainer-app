import axios from "axios";
import { getDb } from "./db";
import { books, Book, InsertBook } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
    pageCount?: number;
    language?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
  };
}

/**
 * Fetch book metadata from Google Books API
 */
export async function fetchGoogleBooksMetadata(bookTitle: string): Promise<GoogleBooksVolume | null> {
  try {
    const response = await axios.get(GOOGLE_BOOKS_API_URL, {
      params: {
        q: bookTitle,
        maxResults: 1,
        fields: "items(id,volumeInfo(title,authors,publishedDate,description,imageLinks,pageCount,language,categories,averageRating,ratingsCount))",
      },
      timeout: 5000,
    });

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0];
    }
    return null;
  } catch (error) {
    if ((error as any).response?.status === 429) { console.warn("[BookMetadata] Rate limited by Google Books API"); } else { console.error("[BookMetadata] Error fetching from Google Books API:", (error as any).message); }
    return null;
  }
}

/**
 * Get or create book metadata in database
 */
export async function getOrCreateBookMetadata(bookTitle: string): Promise<Book | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if book already exists in database
    const existingBooks = await db
      .select()
      .from(books)
      .where(eq(books.title, bookTitle))
      .limit(1);

    if (existingBooks.length > 0) {
      return existingBooks[0];
    }

    // Fetch from Google Books API
    const googleBook = await fetchGoogleBooksMetadata(bookTitle);
    if (!googleBook) {
      return null;
    }

    const volumeInfo = googleBook.volumeInfo;
    const newBook: InsertBook = {
      title: volumeInfo.title || bookTitle,
      author: volumeInfo.authors?.[0] || null,
      googleBooksId: googleBook.id,
      coverUrl: volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.thumbnail || null,
      description: volumeInfo.description || null,
      rating: volumeInfo.averageRating ? Math.round(volumeInfo.averageRating * 10) : null,
      publishedDate: volumeInfo.publishedDate || null,
      pageCount: volumeInfo.pageCount || null,
      language: volumeInfo.language || "en",
      categories: volumeInfo.categories?.join(",") || null,
    };

    // Insert into database
    await db.insert(books).values(newBook);

    // Fetch and return the created book
    const createdBooks = await db
      .select()
      .from(books)
      .where(eq(books.googleBooksId, googleBook.id))
      .limit(1);

    return createdBooks.length > 0 ? createdBooks[0] : null;
  } catch (error) {
    console.error("[BookMetadata] Error in getOrCreateBookMetadata:", error);
    return null;
  }
}

/**
 * Format book metadata for display
 */
export function formatBookMetadata(book: Book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    description: book.description,
    rating: book.rating ? (book.rating / 10).toFixed(1) : null,
    publishedDate: book.publishedDate,
    pageCount: book.pageCount,
    categories: book.categories?.split(",") || [],
  };
}
