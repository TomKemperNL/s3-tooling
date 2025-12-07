
function mergeAuthors(pie: { [name: string]: number }, mapping: { [name: string]: string }) {
    const merged: { [name: string]: number } = {};
    for (const key in pie) {
        const mapped = mapping[key] || key; // Als er geen mapping is, gebruik de originele naam
        merged[mapped] = (merged[mapped] || 0) + pie[key];
    }
    return merged;
}


export class GroupAuthorPie {

    private data: Record<string, Record<string, number>> = {};
    constructor(initialData?: Record<string, Record<string, number>>) {
        if (initialData) {
            this.data = JSON.parse(JSON.stringify(initialData));
        }
    }

    addGroup(group: string, authorsData: Record<string, number>) {
        if (this.data[group]) {
            throw new Error(`Group ${group} already exists in the pie chart`); //TODO: dat kan gebruikersvriendelijker
        }
        this.data[group] = authorsData;
    }

    addPie(otherPie: GroupAuthorPie) {
        for (const group of Object.keys(otherPie.data)) {
            if (!this.data[group]) {
                this.data[group] = otherPie.data[group];
            } else {
                for (const author of Object.keys(otherPie.data[group])) {
                    if (!this.data[group][author]) {
                        this.data[group][author] = otherPie.data[group][author];
                    } else {
                        this.data[group][author] += otherPie.data[group][author];
                    }
                }
            }
        }
    }

    mapAuthors(authorMapping: Record<string, string>) {
        for (const group of Object.keys(this.data)) {
            let groupPie = this.data[group];
            groupPie = mergeAuthors(groupPie, authorMapping);
            this.data[group] = groupPie;
        }
    }

    filterAuthors(authors: string[]) {
        for (const group of Object.keys(this.data)) {
            const groupPie = this.data[group];
            const filteredGroupPie: { [name: string]: number } = {};
            for (const author of Object.keys(groupPie)) {
                if (authors.indexOf(author) !== -1) {
                    filteredGroupPie[author] = groupPie[author];
                }
            }
            this.data[group] = filteredGroupPie;
        }
    }

    export(): Record<string, Record<string, number>> {
        return JSON.parse(JSON.stringify(this.data));
    }






}

