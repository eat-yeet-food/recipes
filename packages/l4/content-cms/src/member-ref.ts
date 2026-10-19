/** Public member IDs are strings; D1 relationships store numeric IDs. */
export const memberRef = (id: string | number) => typeof id === 'number' ? id : /^\d{1,15}$/.test(id) ? Number(id) : id
