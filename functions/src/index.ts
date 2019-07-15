import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import { FieldValue } from '@google-cloud/firestore'

admin.initializeApp(functions.config().firebase)
const auth = admin.auth()
const db = admin.firestore()

const app = express()
const main = express()
main.use('/api/v1', app)
main.use(bodyParser.json())

export const webApi = functions.https.onRequest(main)

// AUTH //
//get auth
app.get('/auth', async (request, response) => {
    let arr_user: any[] = []
    auth.listUsers()
        .then((userRecords) => {
            userRecords.users.forEach((user) => {
                arr_user = arr_user.concat(user.toJSON())
            })
            response.send(arr_user)
        })
        .catch((error) => {
            response.send(error)
        })
})

//create auth
app.get('/auth/:email/:password', async (request, response) => {
    const email = request.params.email
    const password = request.params.password

    auth.createUser({
        email: email,
        password: password
    })
        .then(function (userRecord) {
            response.json(userRecord.uid)
        })
        .catch(function (error) {
            console.log('Error creating new user:', error)
        })
})

//update auth
app.post('/auth/:uid/:email/:password', async (request, response) => {
    const uid = request.params.uid
    const email = request.params.email
    const password = request.params.password

    auth.updateUser(uid, {
        email: email,
        password: password
    })
        .then(function (userRecord) {
            console.log('Successfully updated user', userRecord.toJSON())
        })
        .catch(function (error) {
            console.log('Error updating user:', error)
        })
})

// USER //
//get user by id
app.get('/user/:id', async (request, response) => {
    try {
        const uid = request.params.id
        const user = await db.collection('branch/f303/users').doc(uid).get()
        response.json(user.data())

    } catch (error) {
        response.status(500).send(error)
    }
})

//get user OH
app.get('/userOH', async (request, response) => {
    try {
        const querySnapshot = await db.collection('branch/f303/users').get()
        const users: any[] = []
        querySnapshot.forEach(
            (doc) => {
                if (doc.data().operationHead === "") {
                    let arr = {
                        "userId": doc.data().userId,
                        "name": doc.data().name,
                        "profileImage": doc.data().profileImage
                    }
                    users.push(arr)
                }
            }
        )
        response.json({ users: users })

    } catch (error) {
        response.status(500).send(error)
    }
})

//get user senior
app.get('/userSenior', async (request, response) => {
    try {
        const querySnapshot = await db.collection('branch/f303/users').get()
        const users: any[] = []
        querySnapshot.forEach(
            (doc) => {
                if ((doc.data().operationHead !== "") && (doc.data().senior === "")) {
                    let arr = { "userId": doc.data().userId, "name": doc.data().name, "profileImage": doc.data().profileImage }
                    users.push(arr)
                }
            }
        )
        response.json({ users: users })

    } catch (error) {
        response.status(500).send(error)
    }
})

//get all user
app.get('/users', async (request, response) => {
    try {
        const querySnapshot = await db.collection('branch/f303/users').get()
        const users: any[] = []
        querySnapshot.forEach(
            (doc) => {
                users.push(doc.data())
            }
        )
        response.json({ users: users })

    } catch (error) {
        response.status(500).send(error)
    }
})

//create user
app.post('/user/:id', async (request, response) => {
    try {
        const userId = request.params.id
        const leaveBalance = 19
        const leave = false
        const pjs = ""
        const profileImage = "https://firebasestorage.googleapis.com/v0/b/absensi-app-3449e.appspot.com/o/boss.png?alt=media&token=b1a8de16-249f-4160-92fe-91b954f72ebe"

        const {
            employeeNumber,
            name,
            operationHead,
            position,
            senior,
            organic
        } = request.body

        const data = {
            employeeNumber,
            leaveBalance,
            name,
            operationHead,
            position,
            profileImage,
            senior,
            organic,
            leave,
            pjs,
            userId
        }
        const users = await db.collection('branch/f303/users').doc(userId)
        await db.doc('branch/f303/users/' + userId).set(data)

        const user = await users.get()
        response.json(user.data())

    } catch (error) {
        response.status(500).send(error)
    }
})

//update user
app.put('/user/:id', async (request, response) => {
    try {
        const userId = request.params.id

        const {
            name,
            position,
            senior,
            operationHead,
            leaveBalance,
            organic,
            leave,
            pjs
        } = request.body

        const data = {
            name,
            position,
            senior,
            operationHead,
            leaveBalance,
            organic,
            leave,
            pjs
        }

        await db.collection('branch/f303/users').doc(userId).set(data, { merge: true })
            .then(function () {
                console.log('Success')
            })
            .catch(function (error) {
                console.log(error)
            })

        const user = await db.collection('branch/f303/users').doc(userId).get()
        response.json(user.data())

    } catch (error) {
        response.status(500).send(error)
    }
})

//delete user
app.delete('/user/:uid', async (request, response) => {
    const uid = request.params.uid

    try {
        await db.collection('branch/f303/users')
            .doc(uid)
            .delete()

        auth.deleteUser(uid)
            .then(function () {
                console.log('Successfully deleted user')
            })
            .catch(function (error) {
                console.log('Error getting user:', error)
            })

    } catch (error) {
        response.status(500).send(error)
    }
})

// PERMIT //
//get permit
app.get('/permits/:id', async (request, response) => {
    try {
        const uid = request.params.id
        const permitSnapshot = await db.collection('branch/f303/users').doc(uid).collection('permits').get()
        const counterSnapshot = await db.collection('branch/f303/counter').doc(uid).get()

        let counter = counterSnapshot.data()
        const permits: any[] = []
        permitSnapshot.forEach(
            (doc) => {
                permits.push(doc.data())
            }
        )

        response.json({ counter: counter, permits: permits })

    } catch (error) {
        response.status(500).send(error)
    }
})

//create permit manual
app.post('/permit/:id', async (request, response) => {
    try {
        const userId = request.params.id
        let userExist = false
        const userSnapshot = await db.collection('branch/f303/users').get()

        userSnapshot.forEach(
            (doc) => {
                if (doc.data().userId === userId) {
                    userExist = true
                }
            }
        )

        const {
            applicantName,
            cost,
            dateBack,
            dateIn,
            dateTo,
            drive,
            employeeNumber,
            from,
            leaveDuration,
            operationHead,
            profileImage,
            senior,
            status,
            type,
            title,
            to
        } = request.body

        const permits = await db.collection('branch/f303/allpermits').doc()
        const permitId = permits.id

        //buat nomor surat
        let currentdate = new Date()
        let year = currentdate.getFullYear()
        let str, number, newNumber
        let kodeJabatan

        const user = await db.collection('branch/f303/users').doc(userId).get()
        const dataUser = user.data()
        if (dataUser !== undefined) {
            if (dataUser.organic === true) {
                kodeJabatan = "/F33114/"
            }
            else {
                kodeJabatan = "/F33552/"
            }
        }
        else {
            kodeJabatan = "/F33114/"
        }

        const lastpermit = await db.collection('branch/f303/allpermits').orderBy("permitNumber", "desc").limit(1).get()
        if (lastpermit.empty === true) {
            newNumber = padLeft(String(1), '0', 4)
        }
        else {
            lastpermit.forEach(
                (doc) => {
                    str = doc.data().permitNumber
                    number = str.substr(4, 4)
                }
            )
            let res = Number(number) + 1
            newNumber = padLeft(String(res), '0', 4)
        }

        let permitNumber = "SIJ-" + String(newNumber) + kodeJabatan + String(year) + "-S8"

        const data = {
            applicantName,
            cost,
            dateBack,
            dateIn,
            dateTo,
            drive,
            employeeNumber,
            from,
            leaveDuration,
            operationHead,
            profileImage,
            senior,
            status,
            type,
            title,
            to,
            permitId,
            permitNumber,
            userId
        }

        if (userExist) {
            await db.doc('branch/f303/allpermits/' + permitId).set(data)
                .then(function () {
                    console.log('Success')
                })
                .catch(function (error) {
                    console.log(error)
                })

            await db.doc('branch/f303/users/' + userId + "/permits/" + permitId).set(data)
                .then(function () {
                    console.log('Success')
                })
                .catch(function (error) {
                    console.log(error)
                })
        }
        else {
            await db.doc('branch/f303/allpermits/' + permitId).set(data)
                .then(function () {
                    console.log('Success')
                })
                .catch(function (error) {
                    console.log(error)
                })

            //update counter approved pada global (+1)
            await db.collection('branch/f303/counter').doc("counterGlobal").set({
                counterApproved: FieldValue.increment(1)
            },
                { merge: true }
            )
                .then(function () {
                    console.log('Success')
                })
                .catch(function (error) {
                    console.log(error)
                })
        }

    } catch (error) {
        response.status(500).send(error)
    }
})

//update permit
app.put('/permit/:uid/:pid', async (request, response) => {
    try {
        const userId = request.params.uid
        const permitId = request.params.pid

        const {
            applicantName,
            cost,
            dateBack,
            dateIn,
            dateTo,
            drive,
            employeeNumber,
            from,
            leaveDuration,
            operationHead,
            profileImage,
            senior,
            status,
            type,
            title,
            to,
            permitNumber
        } = request.body

        const data = {
            applicantName,
            cost,
            dateBack,
            dateIn,
            dateTo,
            drive,
            employeeNumber,
            from,
            leaveDuration,
            operationHead,
            profileImage,
            senior,
            status,
            type,
            title,
            to,
            permitId,
            permitNumber,
            userId
        }

        await db.doc('branch/f303/users/' + userId + "/permits/" + permitId).set(data, { merge: true })
            .then(function () {
                console.log('Success')
            })
            .catch(function (error) {
                console.log(error)
            })

        await db.doc('branch/f303/allpermits/' + permitId).set(data, { merge: true })
            .then(function () {
                console.log('Success')
            })
            .catch(function (error) {
                console.log(error)
            })

    } catch (error) {
        response.status(500).send(error)
    }
})

//get permit request
app.get('/permitRequest/:id', async (request, response) => {
    try {
        const uid = request.params.id
        const counterSnapshot = await db.collection('branch/f303/counter').doc(uid).get()

        const permitSnapshot =
            await db.collection('branch/f303/users')
                .doc(uid).collection('permits')
                .where("status.request", "==", true).get()

        const permits: any[] = []
        const counter = counterSnapshot.data()
        permitSnapshot.forEach(
            (doc) => {
                permits.push(doc.data())
            }
        )
        response.json({ counter: counter, permits: permits })

    } catch (error) {
        response.status(500).send(error)
    }
})

//get permit negotiate
app.get('/permitNegotiate/:id', async (request, response) => {
    try {
        const uid = request.params.id
        const counterSnapshot = await db.collection('branch/f303/counter').doc(uid).get()

        const permitSnapshot =
            await db.collection('branch/f303/users')
                .doc(uid).collection('permits')
                .where("status.negotiate", "==", true).get()

        const permits: any[] = []
        const counter = counterSnapshot.data()
        permitSnapshot.forEach(
            (doc) => {
                permits.push(doc.data())
            }
        )
        response.json({ counter: counter, permits: permits })

    } catch (error) {
        response.status(500).send(error)
    }
})

//get permit complete
app.get('/permitComplete/:id', async (request, response) => {
    try {
        const uid = request.params.id
        const counterSnapshot = await db.collection('branch/f303/counter').doc(uid).get()

        const permitSnapshot =
            await db.collection('branch/f303/users')
                .doc(uid).collection('permits')
                .where("status.complete", "==", true).get()

        const permits: any[] = []
        const counter = counterSnapshot.data()
        permitSnapshot.forEach(
            (doc) => {
                permits.push(doc.data())
            }
        )
        response.json({ counter: counter, permits: permits })

    } catch (error) {
        response.status(500).send(error)
    }
})

//get permit atasan
app.get('/permitAtasan/:id', async (request, response) => {
    try {
        const uid = request.params.id

        const seniorSnapshot =
            await db.collection('branch/f303/allpermits')
                .where("senior", "==", uid)
                .where("status.request", "==", true)
                .where("status.confirmBySenior", "==", false)
                .where("status.confirmByOH", "==", false)
                .get()

        const OHSnapshot =
            await db.collection('branch/f303/allpermits')
                .where("operationHead", "==", uid)
                .where("status.request", "==", true)
                .where("status.confirmBySenior", "==", true)
                .where("status.confirmByOH", "==", false)
                .get()

        if (seniorSnapshot.empty === false) {
            const senior: any[] = []
            seniorSnapshot.forEach(
                (doc) => {
                    senior.push(doc.data())
                }
            )
            response.json({ permits: senior })
        }
        else if (OHSnapshot.empty === false) {
            const OH: any[] = []
            OHSnapshot.forEach(
                (doc) => {
                    OH.push(doc.data())
                }
            )
            response.json({ permits: OH })
        }
        else {
            console.log("atasan not found")
        }

    } catch (error) {
        response.status(500).send(error)
    }
})

// TRIGGERS //
//trigger create user
exports.onCreateUser = functions.firestore
    .document('branch/f303/users/{userId}')
    .onCreate(async (snapshot, context) => {
        try {
            const userId = context.params.userId

            const counterRequest = 0
            const counterComplete = 0
            const counterConfirm = 0

            const counterData = {
                counterRequest,
                counterComplete,
                counterConfirm
            }

            //menambahkan collection dan document counter ketika user pertama kali dibuat
            await db.collection('branch/f303/counter').doc(userId).set(counterData)
        } catch (error) {
            console.log(error)
        }
    })

//trigger create permit
exports.onCreatePermit = functions.firestore
    .document('branch/f303/users/{userId}/permits/{permitId}')
    .onCreate(async (snapshot, context) => {
        try {
            const userId = context.params.userId
            const permitId = context.params.permitId

            //mendapatkan user dan perrmit ybs
            const user = await db.collection('branch/f303/users').doc(userId).get()
            const permit = await db.collection('branch/f303/users/' + userId + '/permits').doc(permitId).get()
            //mendapatkan permit yg paling terakhir
            const lastpermit = await db.collection('branch/f303/allpermits').orderBy("permitNumber", "desc").limit(1).get()
            //mendapatkan permit yg merupakan cuti
            const permitCuti = await db.collection('branch/f303/allpermits').where("type", "array-contains", "Cuti").get()

            const dataUser = user.data()
            let tokenUser, nameUser, imageUser, senior, operationHead, leaveBalance, status
            let registrationToken, registrationTokenSenior, registrationTokenOH
            let message, messageSenior, messageOH

            //mengecek apakah permit yang diajukan merupakan cuti
            permitCuti.forEach(
                (doc) => {
                    if (doc.data().permitId === permitId) {
                        status = 0
                    }
                }
            )

            //mendapatkan isi field document dari user ybs
            if (dataUser !== undefined) {
                tokenUser = dataUser.token
                nameUser = dataUser.name
                imageUser = dataUser.profileImage
                leaveBalance = dataUser.leaveBalance

                //mendapatkan id senior dari user
                senior = dataUser.senior
                //mendapatkan id senior jika digantikan pjs
                if (senior !== "") {
                    const getSenior = await db.collection('branch/f303/users').doc(senior).get()
                    const dataSenior = getSenior.data()
                    if (dataSenior !== undefined) {
                        const pjsSenior = dataSenior.pjs
                        if (pjsSenior !== "") {
                            senior = pjsSenior
                        }
                        else {
                            senior = dataUser.senior
                        }
                    }
                }

                //mendapatkan id OH dari user
                operationHead = dataUser.operationHead
                //mendapatkan id OH jika digantikan pjs
                if (operationHead !== "") {
                    const getOH = await db.collection('branch/f303/users').doc(operationHead).get()
                    const dataOH = getOH.data()
                    if (dataOH !== undefined) {
                        const pjsOH = dataOH.pjs
                        if (pjsOH !== "") {
                            operationHead = pjsOH
                        }
                        else {
                            operationHead = dataUser.operationHead
                        }
                    }
                }
            }

            //mendapatkan jumlah HK dan status dari permit
            const dataPermit = permit.data()
            let leaveDuration
            let manual
            if (dataPermit !== undefined) {
                leaveDuration = dataPermit.leaveDuration
                manual = dataPermit.status.manual
            }

            //jika permit dibuat manual
            if (manual === true) {
                console.log("Input manual")

                //update counter complete pada user (+1)
                await db.collection('branch/f303/counter').doc(userId).set({
                    counterComplete: FieldValue.increment(1)
                },
                    { merge: true }
                )
                    .then(function () {
                        console.log('Success')
                    })
                    .catch(function (error) {
                        console.log(error)
                    })

                //update counter approved pada global (+1)
                await db.collection('branch/f303/counter').doc('counterGlobal').set({
                    counterApproved: FieldValue.increment(1)
                },
                    { merge: true }
                )
                    .then(function () {
                        console.log('Success')
                    })
                    .catch(function (error) {
                        console.log(error)
                    })
            }

            //jika permit tidak dibuat manual
            else {
                //trigger atasan dan OH
                if (senior === "") {
                    //trigger OH create permit
                    if (operationHead === "") {
                        let leaveResult
                        if (status === 0) {
                            leaveResult = leaveBalance - leaveDuration
                        }
                        else {
                            leaveResult = leaveBalance
                        }

                        //update jumlah HK setelah dikurangi
                        await db.collection('branch/f303/users').doc(userId).set({
                            leaveBalance: leaveResult
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //update counter complete pada user (+1)
                        await db.collection('branch/f303/counter').doc(userId).set({
                            counterComplete: FieldValue.increment(1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //update counter approved pada global (+1)
                        await db.collection('branch/f303/counter').doc('counterGlobal').set({
                            counterApproved: FieldValue.increment(1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //buat nomor surat sesuai format
                        let currentdate = new Date()
                        let year = currentdate.getFullYear()
                        let str, number, newNumber

                        if (lastpermit.empty === true) {
                            newNumber = padLeft(String(1), '0', 4)
                        }
                        else {
                            lastpermit.forEach(
                                (doc) => {
                                    str = doc.data().permitNumber
                                    number = str.substr(4, 4)
                                }
                            )
                            let res = Number(number) + 1
                            newNumber = padLeft(String(res), '0', 4)
                        }

                        let permitNumber = "SIJ-" + String(newNumber) + "/F33114/" + String(year) + "-S8"

                        //update nomor surat pada permit lokal user
                        await db.collection('branch/f303/users/' + userId + '/permits').doc(permitId).set({
                            permitNumber: permitNumber
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //update nomor surat pada permit global
                        await db.collection('branch/f303/allpermits').doc(permitId).set({
                            permitNumber: permitNumber
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //notifikasi
                        registrationToken = tokenUser
                        message = {
                            data: {
                                "title": "SIJ sudah terbit",
                                "body": "SIJ yang kamu ajukan telah terbit",
                                "image": imageUser
                            },
                            token: registrationToken
                        }

                        admin.messaging().send(message)
                            .then((response) => {
                                console.log('Successfully sent message:', response)
                            })
                            .catch((error) => {
                                console.log('Error sending message:', error)
                            })
                    }

                    //trigger atasan create permit
                    else {
                        //update counter request pada user (+1)
                        await db.collection('branch/f303/counter').doc(userId).set({
                            counterRequest: FieldValue.increment(1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //update counter confirm pada OH (+1)
                        await db.collection('branch/f303/counter').doc(operationHead).set({
                            counterConfirm: FieldValue.increment(1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //notifikasi
                        const docOH = await db.collection('branch/f303/users').doc(operationHead).get()
                        const dtOH = docOH.data()

                        if (dtOH !== undefined) {
                            registrationTokenOH = dtOH.token
                        }

                        messageOH = {
                            data: {
                                "title": "Permintaan SIJ baru",
                                "body": "Permintaan SIJ baru dari " + nameUser,
                                "image": imageUser
                            },
                            token: registrationTokenOH
                        }

                        admin.messaging().send(messageOH)
                            .then((response) => {
                                console.log('Successfully sent message:', response)
                            })
                            .catch((error) => {
                                console.log('Error sending message:', error)
                            })
                    }
                }

                //trigger user create permit
                else {
                    //update counter request pada user (+1)
                    await db.collection('branch/f303/counter').doc(userId).set({
                        counterRequest: FieldValue.increment(1)
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })

                    //update counter confirm pada atasan (+1)
                    await db.collection('branch/f303/counter').doc(senior).set({
                        counterConfirm: FieldValue.increment(1)
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })

                    //notifikasi
                    const docSenior = await db.collection('branch/f303/users').doc(senior).get()
                    const dtSenior = docSenior.data()

                    if (dtSenior !== undefined) {
                        registrationTokenSenior = dtSenior.token
                    }

                    messageSenior = {
                        data: {
                            "title": "Permintaan SIJ baru",
                            "body": "Permintaan SIJ baru dari " + nameUser,
                            "image": imageUser
                        },
                        token: registrationTokenSenior
                    }

                    admin.messaging().send(messageSenior)
                        .then((response) => {
                            console.log('Successfully sent message:', response)
                        })
                        .catch((error) => {
                            console.log('Error sending message:', error)
                        })
                }
            }
        } catch (error) {
            console.log(error)
        }
    })

//trigger update permit
exports.onUpdatePermit = functions.firestore
    .document('branch/f303/users/{userId}/permits/{permitId}')
    .onUpdate(async (change, context) => {
        try {
            const userId = context.params.userId
            const permitId = context.params.permitId
            const newValue = change.after.data()
            const previousValue = change.before.data()

            //mendapatkan user dan perrmit ybs
            const user = await db.collection('branch/f303/users').doc(userId).get()
            const permit = await db.collection('branch/f303/users/' + userId + '/permits').doc(permitId).get()
            //mendapatkan permit yg paling terakhir
            const lastpermit = await db.collection('branch/f303/allpermits').orderBy("permitNumber", "desc").limit(1).get()
            //mendapatkan permit yg merupakan cuti
            const permitCuti = await db.collection('branch/f303/allpermits').where("type", "array-contains", "Cuti").get()

            //mendapatkan jumlah HK dari permit
            const dataPermit = permit.data()
            let leaveDuration
            if (dataPermit !== undefined) {
                leaveDuration = dataPermit.leaveDuration
            }

            const dataUser = user.data()
            let tokenUser, imageUser, nameUser, senior, operationHead, leaveBalance
            //mendapatkan isi field document dari user ybs
            if (dataUser !== undefined) {
                tokenUser = dataUser.token
                nameUser = dataUser.name
                imageUser = dataUser.profileImage
                leaveBalance = dataUser.leaveBalance

                //mendapatkan id senior dari user
                senior = dataUser.senior
                //mendapatkan id senior jika digantikan pjs
                if (senior !== "") {
                    const getSenior = await db.collection('branch/f303/users').doc(senior).get()
                    const dataSenior = getSenior.data()
                    if (dataSenior !== undefined) {
                        const pjsSenior = dataSenior.pjs
                        if (pjsSenior !== "") {
                            senior = pjsSenior
                        }
                        else {
                            senior = dataUser.senior
                        }
                    }
                }

                //mendapatkan id OH dari user
                operationHead = dataUser.operationHead
                //mendapatkan id OH jika digantikan pjs
                if (operationHead !== "") {
                    const getOH = await db.collection('branch/f303/users').doc(operationHead).get()
                    const dataOH = getOH.data()
                    if (dataOH !== undefined) {
                        const pjsOH = dataOH.pjs
                        if (pjsOH !== "") {
                            operationHead = pjsOH
                        }
                        else {
                            operationHead = dataUser.operationHead
                        }
                    }
                }
            }

            let n_confirmByOH, p_confirmByOH
            let n_confirmBySenior, p_confirmBySenior
            let n_request, p_request
            let n_negotiate, p_negotiate
            let n_cancel

            //mendapatkan nilai seluruh field sesudah diupdate
            if (newValue !== undefined) {
                n_confirmByOH = newValue.status.confirmByOH
                n_confirmBySenior = newValue.status.confirmBySenior
                n_request = newValue.status.request
                n_negotiate = newValue.status.negotiate
                n_cancel = newValue.status.cancel
            }

            //mendapatkan nilai seluruh field sebelum diupdate
            if (previousValue !== undefined) {
                p_confirmByOH = previousValue.status.confirmByOH
                p_confirmBySenior = previousValue.status.confirmBySenior
                p_request = previousValue.status.request
                p_negotiate = previousValue.status.negotiate
            }

            //mengecek apakah permit yang diajukan merupakan cuti
            let status
            permitCuti.forEach(
                (doc) => {
                    if (doc.data().permitId === permitId) {
                        status = 0
                    }
                }
            )

            let registrationToken, registrationTokenUser, registrationTokenOH
            let message, messageUser, messageOH
            let imageSenior, imageOH

            //negosiasi
            if (n_negotiate !== p_negotiate && n_negotiate === true) {

                //nego OH
                if (n_confirmBySenior === true && n_confirmByOH === false) {
                    //notifikasi
                    const docOH = await db.collection('branch/f303/users').doc(operationHead).get()
                    const dtOH = docOH.data()

                    if (dtOH !== undefined) {
                        imageOH = dtOH.profileImage
                    }

                    registrationToken = tokenUser
                    message = {
                        data: {
                            "title": "SIJ dinegosiasi",
                            "body": "SIJ yang kamu ajukan dinegosiasi oleh OH",
                            "image": imageOH
                        },
                        token: registrationToken
                    }

                    admin.messaging().send(message)
                        .then((response) => {
                            console.log('Successfully sent message:', response)
                        })
                        .catch((error) => {
                            console.log('Error sending message:', error)
                        })
                }

                //nego atasan
                else if (n_confirmBySenior === false && n_confirmByOH === false) {
                    //notifikasi
                    const docSenior = await db.collection('branch/f303/users').doc(senior).get()
                    const dtSenior = docSenior.data()

                    if (dtSenior !== undefined) {
                        imageSenior = dtSenior.profileImage
                    }

                    registrationToken = tokenUser
                    message = {
                        data: {
                            "title": "SIJ dinegosiasi",
                            "body": "SIJ yang kamu ajukan dinegosiasi oleh atasan",
                            "image": imageSenior
                        },
                        token: registrationToken
                    }

                    admin.messaging().send(message)
                        .then((response) => {
                            console.log('Successfully sent message:', response)
                        })
                        .catch((error) => {
                            console.log('Error sending message:', error)
                        })
                }
            }

            //acc OH
            else if (n_confirmByOH !== p_confirmByOH && n_request !== p_request) {
                if (n_confirmByOH === true && n_request === false) {
                    let leaveResult
                    if (status === 0) {
                        leaveResult = leaveBalance - leaveDuration
                    }
                    else {
                        leaveResult = leaveBalance
                    }

                    //update jumlah HK setelah dikurangi
                    await db.collection('branch/f303/users').doc(userId).set({
                        leaveBalance: leaveResult
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })

                    //update counter complete pada user (+1)
                    await db.collection('branch/f303/counter').doc(userId).set({
                        counterComplete: FieldValue.increment(1)
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })

                    //update counter request pada user (-1)
                    await db.collection('branch/f303/counter').doc(userId).set({
                        counterRequest: FieldValue.increment(-1)
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })

                    //update counter confirm pada OH (-1)
                    await db.collection('branch/f303/counter').doc(operationHead).set({
                        counterConfirm: FieldValue.increment(-1)
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })

                    //update counter approved pada global (+1)
                    await db.collection('branch/f303/counter').doc("counterGlobal").set({
                        counterApproved: FieldValue.increment(1)
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })

                    //notifikasi
                    const docOH = await db.collection('branch/f303/users').doc(operationHead).get()
                    const dtOH = docOH.data()

                    if (dtOH !== undefined) {
                        imageOH = dtOH.profileImage
                    }

                    registrationToken = tokenUser
                    message = {
                        data: {
                            "title": "SIJ sudah terbit",
                            "body": "SIJ yang kamu ajukan telah disetujui oleh OH",
                            "image": imageOH
                        },
                        token: registrationToken
                    }

                    admin.messaging().send(message)
                        .then((response) => {
                            console.log('Successfully sent message:', response)
                        })
                        .catch((error) => {
                            console.log('Error sending message:', error)
                        })
                }

                //buat nomor surat sesuai format
                let currentdate = new Date()
                let year = currentdate.getFullYear()
                let str, number, newNumber
                let kodeJabatan

                //cek user termasuk organik atau tkjp
                if (dataUser !== undefined) {
                    if (dataUser.organic === true) {
                        kodeJabatan = "/F33114/"
                    }
                    else {
                        kodeJabatan = "/F33552/"
                    }
                }

                if (lastpermit.empty === true) {
                    newNumber = padLeft(String(1), '0', 4)
                }
                else {
                    lastpermit.forEach(
                        (doc) => {
                            str = doc.data().permitNumber
                            number = str.substr(4, 4)
                        }
                    )
                    let res = Number(number) + 1
                    newNumber = padLeft(String(res), '0', 4)
                }

                let permitNumber = "SIJ-" + String(newNumber) + kodeJabatan + String(year) + "-S8"

                //update nomor permit lokal pada user
                await db.collection('branch/f303/users/' + userId + '/permits').doc(permitId).set({
                    permitNumber: permitNumber
                },
                    { merge: true }
                )
                    .then(function () {
                        console.log('Success')
                    })
                    .catch(function (error) {
                        console.log(error)
                    })

                //update nomor permit global
                await db.collection('branch/f303/allpermits').doc(permitId).set({
                    permitNumber: permitNumber
                },
                    { merge: true }
                )
                    .then(function () {
                        console.log('Success')
                    })
                    .catch(function (error) {
                        console.log(error)
                    })
            }

            //acc atasan
            else if (n_confirmBySenior !== p_confirmBySenior) {
                if (n_confirmBySenior === true && n_request === true) {
                    //update counter confirm pada atasan (-1)
                    await db.collection('branch/f303/counter').doc(senior).set({
                        counterConfirm: FieldValue.increment(-1)
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })

                    //update counter confirm pada OH (+1)
                    await db.collection('branch/f303/counter').doc(operationHead).set({
                        counterConfirm: FieldValue.increment(1)
                    },
                        { merge: true }
                    )
                        .then(function () {
                            console.log('Success')
                        })
                        .catch(function (error) {
                            console.log(error)
                        })
                }

                //notifikasi
                const docOH = await db.collection('branch/f303/users').doc(operationHead).get()
                const docSenior = await db.collection('branch/f303/users').doc(senior).get()
                const dtOH = docOH.data()
                const dtSenior = docSenior.data()

                if (dtOH !== undefined) {
                    registrationTokenOH = dtOH.token
                }
                if (dtSenior !== undefined) {
                    imageSenior = dtSenior.profileImage
                }
                registrationTokenUser = tokenUser

                messageUser = {
                    data: {
                        "title": "SIJ disetujui",
                        "body": "SIJ yang kamu ajukan telah disetujui oleh atasan",
                        "image": imageSenior
                    },
                    token: registrationTokenUser
                }
                messageOH = {
                    data: {
                        "title": "Permintaan SIJ baru",
                        "body": "Permintaan SIJ baru dari " + nameUser,
                        "image": imageUser
                    },
                    token: registrationTokenOH
                }

                admin.messaging().send(messageUser)
                    .then((response) => {
                        console.log('Successfully sent message:', response)
                    })
                    .catch((error) => {
                        console.log('Error sending message:', error)
                    })

                admin.messaging().send(messageOH)
                    .then((response) => {
                        console.log('Successfully sent message:', response)
                    })
                    .catch((error) => {
                        console.log('Error sending message:', error)
                    })
            }

            // tolak
            else if (n_request !== p_request) {
                if (n_request === false) {
                    if (n_confirmBySenior === true) {
                        //update counter complete pada user (+1)
                        await db.collection('branch/f303/counter').doc(userId).set({
                            counterComplete: FieldValue.increment(1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //update counter request pada user (-1)
                        await db.collection('branch/f303/counter').doc(userId).set({
                            counterRequest: FieldValue.increment(-1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //update counter confirm pada OH (-1)
                        await db.collection('branch/f303/counter').doc(operationHead).set({
                            counterConfirm: FieldValue.increment(-1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //notifikasi
                        const docOH = await db.collection('branch/f303/users').doc(operationHead).get()
                        const dtOH = docOH.data()

                        if (dtOH !== undefined) {
                            imageOH = dtOH.profileImage
                        }
                        registrationTokenUser = tokenUser

                        messageUser = {
                            data: {
                                "title": "SIJ ditolak",
                                "body": "SIJ yang kamu ajukan ditolak oleh OH",
                                "image": imageOH
                            },
                            token: registrationTokenUser
                        }

                        admin.messaging().send(messageUser)
                            .then((response) => {
                                console.log('Successfully sent message:', response)
                            })
                            .catch((error) => {
                                console.log('Error sending message:', error)
                            })
                    }
                    else {
                        //update counter complete pada user (+1)
                        await db.collection('branch/f303/counter').doc(userId).set({
                            counterComplete: FieldValue.increment(1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //update counter request pada user (-1)
                        await db.collection('branch/f303/counter').doc(userId).set({
                            counterRequest: FieldValue.increment(-1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //update counter confirm pada atasan (-1)
                        await db.collection('branch/f303/counter').doc(senior).set({
                            counterConfirm: FieldValue.increment(-1)
                        },
                            { merge: true }
                        )
                            .then(function () {
                                console.log('Success')
                            })
                            .catch(function (error) {
                                console.log(error)
                            })

                        //notifikasi
                        if (n_cancel === false) {
                            const docSenior = await db.collection('branch/f303/users').doc(senior).get()
                            const dtSenior = docSenior.data()

                            if (dtSenior !== undefined) {
                                imageSenior = dtSenior.profileImage
                            }
                            registrationTokenUser = tokenUser

                            messageUser = {
                                data: {
                                    "title": "SIJ ditolak",
                                    "body": "SIJ yang kamu ajukan ditolak oleh atasan",
                                    "image": imageSenior
                                },
                                token: registrationTokenUser
                            }

                            admin.messaging().send(messageUser)
                                .then((response) => {
                                    console.log('Successfully sent message:', response)
                                })
                                .catch((error) => {
                                    console.log('Error sending message:', error)
                                })
                        }
                    }
                }
            }
            else {
                console.log("Trigger update error")
            }
        } catch (error) {
            console.log(error)
        }
    })

//function string pad
function padLeft(text: string, padChar: string, size: number): string {
    return (String(padChar).repeat(size) + text).substr((size * -1), size)
}