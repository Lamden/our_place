import { snackbars, dTau, userAccount } from "./stores";
import { get } from 'svelte/store'
import { config } from "./config";

export const createSnack = (title, body, type) => {
    snackbars.update(curr => {
        let snack = { type, time: new Date().getTime(), title, body }
        return [...curr, snack]
    })
}

export const processTxResults = (results) => {
    if (results.data) {
        if (results.data.errors) return results.data.errors
        if (results.data.resultInfo) {
            createSnack(
                results.data.resultInfo.title,
                results.data.resultInfo.subtitle,
                results.data.resultInfo.type
            )
            refreshTAUBalance(get(userAccount))
        }
    }
    return []
}

export const refreshTAUBalance = async (account) => {
    const res = await fetch(`${config.masternode}/contracts/currency/balances?key=${account}`)
    const data = await res.json();
    if (!data.value) dTau.set(0)
    else dTau.set(data.value);
}