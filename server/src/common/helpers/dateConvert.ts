export const jsDate2MySqlDateTime = (date: Date = new Date()): string => date.toJSON().slice(0, 19).replace('T', ' ');