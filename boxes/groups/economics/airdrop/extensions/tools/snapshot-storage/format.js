function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

export default function(str, obj) {
    var resStr = str;
    Object.keys(obj).forEach(key => {
        resStr = resStr.replace(new RegExp(escapeRegExp(`{{${key}}}`), 'g'), obj[key]);
    });
    return resStr;
}
