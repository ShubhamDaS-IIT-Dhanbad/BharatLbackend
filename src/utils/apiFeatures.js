class ApiFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }

    search() {
        if (this.queryStr && this.queryStr.keyword) {
            const keyword = this.queryStr.keyword.trim();
            const words = keyword.split(/\s+/);
            const regex = new RegExp(keyword, 'i');
            const numberKeyword = parseFloat(keyword);

            let searchConditions = [
                { title: { $regex: regex } },
                { description: { $regex: regex } },
                { category: { $elemMatch: { $regex: regex } } },
                { brand: { $regex: regex } },
                { keyWords: { $elemMatch: { $regex: regex } } }
            ];

            // Add conditions for each word in the query
            words.forEach(word => {
                const wordRegex = new RegExp(word, 'i');
                searchConditions.push({ title: { $regex: wordRegex } });
                searchConditions.push({ description: { $regex: wordRegex } });
                searchConditions.push({ category: { $elemMatch: { $regex: wordRegex } } });
                searchConditions.push({ brand: { $regex: wordRegex } });
                searchConditions.push({ keyWords: { $elemMatch: { $regex: wordRegex } } });
            });

            // If keyword is a number, include number-specific search conditions
            if (!isNaN(numberKeyword)) {
                searchConditions.push({ price: numberKeyword });
                searchConditions.push({ id: numberKeyword });
            }

            // Use an aggregation pipeline to sort by relevance
            this.query = this.query.model.aggregate([
                {
                    $match: {
                        $or: searchConditions
                    }
                },
                {
                    $addFields: {
                        score: {
                            $sum: [
                                { $cond: [{ $regexMatch: { input: { $ifNull: ["$title", ""] }, regex: regex } }, 10, 0] },
                                { $cond: [{ $regexMatch: { input: { $ifNull: ["$description", ""] }, regex: regex } }, 5, 0] },
                                { $cond: [{ $regexMatch: { input: { $ifNull: [{ $arrayElemAt: ["$category", 0] }, ""] }, regex: regex } }, 8, 0] },
                                { $cond: [{ $regexMatch: { input: { $ifNull: ["$brand", ""] }, regex: regex } }, 7, 0] },
                                { $cond: [{ $regexMatch: { input: { $ifNull: [{ $arrayElemAt: ["$keyWords", 0] }, ""] }, regex: regex } }, 6, 0] },
                                // Add more conditions if needed
                            ]
                        }
                    }
                },
                {
                    $sort: {
                        score: -1
                    }
                }
            ]);
        }
        return this;
    }

    pagination(resultPerPage) {
        const currentPage = parseInt(this.queryStr.page) || 1;
        const limit = parseInt(this.queryStr.limit) || resultPerPage;
        const skip = (currentPage - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);

        return this;
    }

    filter() {
        const queryCopy = { ...this.queryStr };
        const removeFields = ["keyword", "page", "limit"];
        removeFields.forEach((key) => delete queryCopy[key]);
        for (const key in queryCopy) {
            if (!isNaN(parseInt(queryCopy[key]))) {
                queryCopy[key] = parseInt(queryCopy[key]);
            }
        }
        return this;
    }

    filterByPincode() {
        const pincodes = this.queryStr.pincode;
        if (pincodes) {
            const pincodeArray = pincodes.split(',').map(pin => pin.trim());
            this.query = this.query.find({ pinCodes: { $elemMatch: { $in: pincodeArray } } });
        }
        return this;
    }

    filterByCategoryProducts() {
        const categories = this.queryStr.categories;
        if (categories) {
            const categoryArray = categories.split(',').map(category => category.trim());
            this.query = this.query.find({ category: { $elemMatch: { $in: categoryArray } } });
        }
        return this;
    }

    filterByCategoryShop() {
        const categories = this.queryStr.selectedCategories;
        if (categories) {
            const categoryArray = categories.split(',').map(category => category.trim());
            this.query = this.query.find({ category: { $elemMatch: { $in: categoryArray } } });
        }
        return this;
    }

    filterByShop() {
        const shopId = this.queryStr.shopid;
        if (shopId) {
            this.query = this.query.find({ shop: shopId });
        }
        return this;
    }
}

export { ApiFeatures };
